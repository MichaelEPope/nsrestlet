declare module 'nsrestlet' {

  interface BasicSettings {
    /**
     * You NetSuite Account ID. Also known as realm
     */
    accountId: number | string
  }

  /**
   * OAuth requires `accountId`, a `Consumer Key-Secret Pair` (Found on the Integrations page in Netsuite), and a `Token Key-Secret Pair` (Found on the Tokens page in Netsuite).
   */
  interface OAuthSettings extends BasicSettings {
    tokenKey: string,
    tokenSecret: string,
    consumerKey: string,
    consumerSecret: string,
  }

  /**
   * NLAuth requires an `email` and `password`. It also allows us to 
   * specifiy a `role`, which isn't required but is highly reccomended.
   */
  interface NLAuthSettings extends BasicSettings {
    email: string,
    password: string,

    /**
     * Recommended.
     */
    role?: number | string,
  }

  /**
   * If a retryable error occurs and `backoff` and `retries` properties
   * are provided, it will keep requesting until a successful resolution 
   * or the provided limits are reached. Otherwise, an error is returned 
   * instead.
   * 
   * Retryable errors:
   * - `ECONNRESET`
   * - `ESOCKETTIMEDOUT`
   * - `ETIMEDOUT`
   * - `SSS_REQUEST_LIMIT_EXCEEDED`
   */
  interface ErrorRetryURLSettings {
    /**
     * The amount of time, in milliseconds, to exponentially backoff on 
     * each retry.
     */
    backoff?: number,

    /**
     * The number of times to retry the request if an error is returned.
     */
    retries?: number,
  }

  interface DeriveURLSettings extends ErrorRetryURLSettings {
    /**
     * Script Id
     */
    script: number | string,

    /**
     * Deployment Id
     */
    deployment: number | string
  }

  interface URLSettings extends ErrorRetryURLSettings {
    /**
     * Valid URL Like:
     * > https://**accountId**.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=**scriptId**&deploy=**deploymentId**
     */
    url: string
  }

  interface HTTPFacade {
    get(payload: any, callback: (error: any, response: any) => void): void,
    get(payload: any): Promise<any>,

    post(payload: any, callback: (error: any, response: any) => void): void,
    post(payload: any): Promise<any>,

    put(payload: any, callback: (error: any, response: any) => void): void,
    put(payload: any): Promise<any>,

    delete(payload: any, callback: (error: any, response: any) => void): void,
    delete(payload: any): Promise<any>,
  }

  function createLink(
    accountSettings: OAuthSettings | NLAuthSettings,
    urlSettings: URLSettings | DeriveURLSettings
  ): HTTPFacade;
}
