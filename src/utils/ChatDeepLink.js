// ChatDeepLink.jsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import chatStorage from '../utils/chatStorage';

export default function ChatDeepLink({ userType }) {
  const { chatId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    chatStorage.saveActiveChat(chatId, null);
    navigate(userType === 'runner' ? '/raw' : '/welcome', { replace: true });
  }, [chatId, userType, navigate]);

  return null;
}