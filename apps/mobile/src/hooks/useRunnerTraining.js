// hooks/useRunnerTraining.js
import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { updateProfile } from '../Redux/runnerSlice';
import { updateRunner } from '../Redux/authSlice';

export const useRunnerTraining = (runnerId) => {
  const dispatch = useDispatch();
  const [trainingStep, setTrainingStep] = useState('idle'); // idle | prompt | active | complete
  const [showTrainingScreen, setShowTrainingScreen] = useState(false);
  const [isSubmittingTraining, setIsSubmittingTraining] = useState(false);

  useEffect(() => {
    if (!runnerId) return;
    try {
      const raw = localStorage.getItem(`training_progress_${runnerId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.isOpen && parsed?.stage !== 'complete') {
        setShowTrainingScreen(true);
        setTrainingStep('active');
        trainingPromptedRef.current = true; // don't re-push the prompt message
      }
    } catch (_) { /* no-op */ }
  }, [runnerId]);

  const trainingPromptedRef = useRef(false);

  const promptTraining = useCallback((setMessages, isTrainingCompleted = false) => {
    if (isTrainingCompleted) return;
    if (trainingPromptedRef.current) return;

    setMessages(prev => {
      const alreadyPrompted = prev.some(m => m.trainingPromptButton || m.isTraining);
      if (alreadyPrompted) return prev;

      return [...prev, {
        id: `training-prompt-${Date.now()}`,
        from: 'them',
        text: "One last step \u2014 complete your runner training and pass a short test to start accepting errands.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
        isTraining: true,
        trainingPromptButton: true,
      }];
    });


    trainingPromptedRef.current = true;
    setTrainingStep('prompt');
  }, []);

  const openTrainingScreen = useCallback(() => {
    setTrainingStep('active');
    setShowTrainingScreen(true);
  }, []);

  const closeTrainingScreen = useCallback(() => {
    setShowTrainingScreen(false);
  }, []);

  const completeTraining = useCallback(async (score, setMessages) => {
    setIsSubmittingTraining(true);
    try {
      await dispatch(updateProfile({ isTrainingCompleted: true })).unwrap();

      dispatch(updateRunner({ isTrainingCompleted: true }));

      setTrainingStep('complete');
      setShowTrainingScreen(false);

      setMessages(prev => [...prev, {
        id: `training-complete-${Date.now()}`,
        from: 'them',
        text: `You scored ${score}% and passed your runner training. You're all set!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered',
        isTraining: true,
      }]);
    } catch (error) {
      console.error('Failed to save training completion:', error);

    } finally {
      setIsSubmittingTraining(false);
    }
  }, [dispatch]);

  // Reset on logout / runnerId change, mirrors useKycHook's per-runner reset pattern
  const resetTraining = useCallback(() => {
    trainingPromptedRef.current = false;
    setTrainingStep('idle');
    setShowTrainingScreen(false);
  }, []);

  return {
    trainingStep,
    showTrainingScreen,
    isSubmittingTraining,
    promptTraining,
    openTrainingScreen,
    closeTrainingScreen,
    completeTraining,
    resetTraining,
  };
};