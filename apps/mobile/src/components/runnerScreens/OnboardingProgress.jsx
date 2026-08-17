import React from 'react';
import { Check } from 'lucide-react';

const STAGES = [
  { key: 'signup', label: 'Sign Up' },
  { key: 'training', label: 'Training' },
  { key: 'verification', label: 'Verification' },
  { key: 'ready', label: 'Ready' },
];


export const getOnboardingStageIndex = ({
  registrationComplete,
  isTrainingCompleted,
  isVerified,
  kycStep,
}) => {
  if (!registrationComplete) return 0;
  if (!isTrainingCompleted) return 1; 
  if (!isVerified) return 2;          

  // Fully verified + trained — connect flow takes over, hide the indicator.
  if (kycStep === 6) return null;

  return 3;
};

export default function OnboardingProgress({ stageIndex, darkMode }) {
  if (stageIndex === null || stageIndex === undefined) return null;

  return (
    <div className={`px-5 py-3 border-b ${darkMode ? 'bg-black-100 border-white/10' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isComplete = i < stageIndex;
          const isCurrent = i === stageIndex;
          const isLast = i === STAGES.length - 1;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                    isComplete
                      ? 'bg-primary text-white'
                      : isCurrent
                        ? `border-2 border-primary ${darkMode ? 'text-primary bg-black-100' : 'text-primary bg-white'}`
                        : darkMode
                          ? 'border border-white/20 text-gray-500 bg-black-100'
                          : 'border border-gray-300 text-gray-400 bg-white'
                  }`}
                >
                  {isComplete ? <Check size={13} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight ${
                    isCurrent
                      ? 'text-primary font-semibold'
                      : isComplete
                        ? darkMode ? 'text-gray-300' : 'text-black-100'
                        : darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mb-4 mx-1 transition-colors ${
                    i < stageIndex ? 'bg-primary' : darkMode ? 'bg-white/10' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}