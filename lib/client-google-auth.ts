"use client"

// Client-side Google OAuth handling only
export class ClientGoogleAuth {
  private accessToken: string | null = null

  // Initialize Google OAuth (client-side only)
  async authenticate(): Promise<string | null> {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

      if (!clientId) {
        throw new Error("Client ID não configurado. Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID.")
      }

      // Check if Google API is loaded
      if (typeof window === "undefined" || !window.google || !window.google.accounts) {
        throw new Error("Google API não carregada. Verifique se o script foi carregado corretamente.")
      }

      // Get current origin for redirect URI - use multiple possible URIs
      const currentOrigin = window.location.origin
      const possibleRedirectUris = [
        currentOrigin,
        `${currentOrigin}/`,
        `${currentOrigin}/auth/callback`,
        "http://localhost:3000",
        "https://localhost:3000",
      ]

      console.log("Current origin:", currentOrigin)
      console.log("Possible redirect URIs that should be configured:", possibleRedirectUris)

      // Use tokenClient for authentication with popup mode (doesn't require redirect URI)
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        // Remove redirect_uri to use popup mode instead
        callback: (response: any) => {
          if (response.access_token) {
            this.accessToken = response.access_token
          }
        },
      })

      // Request token using popup mode
      return new Promise((resolve, reject) => {
        try {
          tokenClient.requestAccessToken({
            prompt: "consent",
            callback: (response: any) => {
              if (response && response.access_token) {
                this.accessToken = response.access_token
                resolve(response.access_token)
              } else if (response && response.error) {
                if (response.error === "redirect_uri_mismatch") {
                  const errorMessage = `
Erro de configuração OAuth: redirect_uri_mismatch

Para resolver este problema:

1. Acesse o Google Cloud Console: https://console.cloud.google.com/
2. Vá para "APIs e Serviços" > "Credenciais"
3. Clique na sua credencial OAuth 2.0
4. Na seção "URIs de redirecionamento autorizados", adicione TODOS estes URIs:

${possibleRedirectUris.map((uri) => `   • ${uri}`).join("\n")}

5. Salve as alterações
6. Aguarde alguns minutos para a propagação
7. Tente novamente

URI atual detectado: ${currentOrigin}
                `
                  reject(new Error(errorMessage))
                } else {
                  reject(new Error(`Erro OAuth: ${response.error}`))
                }
              } else {
                resolve(null)
              }
            },
          })
        } catch (error) {
          reject(error)
        }
      })
    } catch (error) {
      console.error("Erro na autenticação:", error)
      throw error
    }
  }

  getAccessToken(): string | null {
    return this.accessToken
  }
}

// Global type declarations
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any
        }
      }
    }
  }
}
