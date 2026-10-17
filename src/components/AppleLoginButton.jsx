import React from 'react'
import AppleSignin from 'react-apple-signin-auth'
import api from '../api/axios'
import { APPLE_CLIENT_ID, appleRedirectUri } from '../config/oauth'

/**
 * Apple Sign-In. Return URL / Services ID domain must include
 * https://www.socialpairly.com (and IP) in Apple Developer console.
 */
const AppleLoginButton = ({ onSuccess, onError, rememberMe = true, className }) => {
  const handleSuccess = async (response) => {
    try {
      const idToken = response?.authorization?.id_token
      if (!idToken) {
        onError?.(new Error('Apple did not return an identity token'))
        return
      }
      const res = await api.post('/auth/apple', { idToken, rememberMe })
      onSuccess?.(res.data)
    } catch (err) {
      onError?.(err)
    }
  }

  return (
    <AppleSignin
      authOptions={{
        clientId: APPLE_CLIENT_ID,
        scope: 'email name',
        redirectURI: appleRedirectUri(),
        state: 'state',
        nonce: 'nonce',
        usePopup: true,
      }}
      uiType="dark"
      className={className || 'w-full rounded-xl py-3 mt-4 flex items-center justify-center bg-black text-white'}
      onSuccess={handleSuccess}
      onError={onError}
    />
  )
}

export default AppleLoginButton
