import axios from 'axios';

axios.defaults.baseURL = "https://kbiz.kasikornbank.com";

const formUrlEncoded = (obj: Record<string, any>): string =>
  Object.entries(obj)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

function getCookieByName(cookies: string[], name: string): string | null {
  const cookie = cookies
    .map(cookie => cookie.split(";")[0].split("="))
    .find(([cookieName]) => cookieName.trim() === name);
  return cookie ? cookie[1] : null;
}

class KBiz {
  private username: string;
  private password: string;
  private bankAccountNumber: string;
  private ibId?: string;
  private token?: string;

  constructor({ username, password, bankAccountNumber, ibId, token }: { username: string; password: string; bankAccountNumber: string; ibId?: string; token?: string }) {
    // Check required fields
    [{ fieldName: 'username', value: username }, { fieldName: 'password', value: password }, { fieldName: 'bankAccountNumber', value: bankAccountNumber }]
      .forEach(({ fieldName, value }) => {
        if (value == undefined || value.trim() === '') {
          throw new Error(`${fieldName} is required.`);
        }
      });

    this.username = username;
    this.password = password;
    this.bankAccountNumber = bankAccountNumber;
    this.ibId = ibId;
    this.token = token;

    if (this.token) axios.defaults.headers.common["Authorization"] = this.token;
    if (this.ibId) axios.defaults.headers.common["X-IB-ID"] = this.ibId;
  }

  async login() {
    try {
      const { headers: createCookieHeaders, data: loginPageData } = await axios.post("/authen/login.do");
      const alteonP = getCookieByName(createCookieHeaders['set-cookie'], 'AlteonP');
      const jSessionId = getCookieByName(createCookieHeaders['set-cookie'], 'JSESSIONID');
      const tokenId = this.extractBetween(loginPageData, `id="tokenId" value="`, `"/>`);

      const loginResponse = await axios.post(
        "/authen/login.do",
        formUrlEncoded({ userName: this.username, password: this.password, tokenId, cmd: "authenticate", locale: "th" }),
        { headers: { 'Cookie': `AlteonP=${alteonP}; JSESSIONID=${jSessionId}` } }
      );

      if (loginResponse.headers['set-cookie'] == undefined) throw new Error("Can't find set-cookie in response headers. Please re-check your username and password.");

      const rssoJSessionId = getCookieByName(loginResponse.headers['set-cookie'], 'JSESSIONID');
      const { data } = await axios.get('/authen/ib/redirectToIB.jsp', { headers: { Cookie: `AlteonP=${alteonP}; JSESSIONID=${rssoJSessionId};` } });
      const rsso = this.extractBetween(data, `dataRsso=`, `";`);
      const result = await axios.post("/services/api/authentication/validateSession", { dataRsso: rsso });
      
      this.ibId = result.data.data.userProfiles[0].ibId;
      this.token = result.headers["x-session-token"];

      axios.defaults.headers.common["Authorization"] = this.token;
      axios.defaults.headers.common["X-IB-ID"] = this.ibId;
      axios.defaults.headers.common["Cookie"] = `AlteonP=${alteonP};`;

      return { success: true, ibId: this.ibId, token: this.token };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  }

  async checkSession() {
    try {
      await axios.post("/services/api/refreshSession", {});
      return true;
    } catch {
      return this.checkSession(); // Retry on failure
    }
  }

  async getTransactionList(limitRow = 7, startDate = null, endDate = null) {
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    
    try {
      const response = await axios.post(
        "/services/api/accountsummary/getRecentTransactionList",
        {
          acctNo: this.bankAccountNumber,
          acctType: "SA",
          custType: "IX",
          endDate: endDate || formattedDate,
          ownerId: this.ibId,
          ownerType: "Company",
          pageNo: "1",
          rowPerPage: limitRow,
          startDate: startDate || formattedDate,
        },
        {
          headers: {
            'Referer': 'https://kbiz.kasikornbank.com/menu/account/account/recent-transaction',
            'Content-Type': 'application/json',
            'Authorization': this.token,
            'X-SESSION-IBID': this.ibId,
            'X-IB-ID': this.ibId,
            'X-VERIFY': 'Y',
            'X-RE-FRESH': 'N',
          }
        }
      );

      const { data: { data: { recentTransactionList } } } = response;
      return recentTransactionList;

    } catch (error) {
      if(error.response?.status == 401){
        return error
      }
      return [];
    }
  }

  async getRecentTransactionDetail(transDate, origRqUid, originalSourceId, debitCreditIndicator, transCode, transType) {
    try {
      const { data } = await axios.post("/services/api/accountsummary/getRecentTransactionDetail", {
        transDate: transDate.split(" ")[0],
        acctNo: this.bankAccountNumber,
        origRqUid,
        custType: "IX",
        originalSourceId,
        transCode,
        debitCreditIndicator,
        transType,
        ownerType: "Company",
        ownerId: this.ibId,
      });

      return data;
    } catch (error) {
      if (!error.response) console.log(error);
      if (error.response?.status === 401) return this.getRecentTransactionDetail(transDate, origRqUid, originalSourceId, debitCreditIndicator, transCode, transType);

      console.error(error.response);
      return null;
    }
  }
  async initializeSession() {
    const loginData = await this.login();
    if (!loginData.success) {
      console.log('Login failed.');
      return null;
    }

    const sessionIsAlive = await this.checkSession();
    if (!sessionIsAlive) {
      console.log('Session is dead.');
      return null;
    }

    const userInfo = await this.getUserInfo();
    if (userInfo == null) {
      console.log('Failed to get user info.');
      return null;
    }

    return userInfo;
  }
  async getUserInfo() {
    try {
      const { data: { data } } = await axios.post("/services/api/accountsummary/getAccountSummaryList", {
        custType: "IX",
        isReload: "N",
        lang: "th",
        nicknameType: "OWNAC",
        ownerId: this.ibId,
        ownerType: "Company",
        pageAmount: 6,
      });
      return data;
    } catch (error) {
      if (!error.response) console.log(error);
      if (error.response?.status === 401) return this.getUserInfo();

      console.error(error.response);
      return null;
    }
  }

  extractBetween(str: string, start: string, end: string): string {
    const startIndex = str.indexOf(start) + start.length;
    return str.substring(startIndex, str.indexOf(end, startIndex));
  }
}

export default KBiz;