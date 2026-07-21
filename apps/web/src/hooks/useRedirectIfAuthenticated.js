import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function useRedirectIfAuthenticated() {
  const navigate = useNavigate();
  const { runner, user, isAuthenticated } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (runner?._id) {
      navigate('/raw', { replace: true });
    } else if (user?._id) {
      navigate('/welcome', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, runner?._id, user?._id]);
}