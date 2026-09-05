export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export interface GmailConnectionStatus {
  connected: boolean;
}
