import React from 'react';
import AppleSignin from 'react-apple-signin-auth';
import api from '../api/axios';

const AppleLoginButton = ({ onSuccess, onError }) => {
  const handleSuccess = async (response) => {
    try {
      const res = await api.post('/auth/apple', { idToken: response.authorization.id_token });
      localStorage.setItem('token', res.data.token);
      onSuccess(res.data);
    } catch (err) {
      onError(err);
    }
  };

  return (
    <AppleSignin
      authOptions={{
        clientId: 'com.socialpairly.web',
        scope: 'email name',
        redirectURI: 'https://yourdomain.com/login',
        state: 'state',
        nonce: 'nonce',
        usePopup: true
      }}
      uiType="dark"
      className="w-full rounded-xl py-3 mt-4 flex items-center justify-center bg-black text-white"
      onSuccess={handleSuccess}
      onError={onError}
    />
  );
};

export default AppleLoginButton;