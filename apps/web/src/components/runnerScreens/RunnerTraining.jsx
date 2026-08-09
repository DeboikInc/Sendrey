import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { runnerAssessment } from '../../utils/runnerAssessment';

const PASS_THRESHOLD = 80;

const storageKey = (runnerId) => `training_progress_${runnerId}`;

const loadProgress = (runnerId) => {
  if (!runnerId) return null;
  try {
    const raw = localStorage.getItem(storageKey(runnerId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

const saveProgress = (runnerId, progress) => {
  if (!runnerId) return;
  try {
    localStorage.setItem(storageKey(runnerId), JSON.stringify(progress));
  } catch (_) { /* no-op */ }
};

const clearProgress = (runnerId) => {
  if (!runnerId) return;
  try {
    localStorage.removeItem(storageKey(runnerId));
  } catch (_) { /* no-op */ }
};


const TRAINING_MODULES = [
  {
    title: 'Welcome to Sendrey Runner Academy',
    sections: [
      {
        paragraphs: [
          "As a Sendrey Runner, you represent the Sendrey brand every time you accept an errand. Customers trust you with their money, personal information, and belongings, and that trust must be earned through professionalism, respect, and reliability.",
          "This training will equip you with the knowledge and standards required to provide excellent service while protecting your safety and maintaining Sendrey's reputation."
        ]
      }
    ]
  },
  {
    title: 'Module 1: Understanding Customer Relationships',
    objective: 'Learn how to build trust, deliver excellent customer service, and create positive customer experiences.',
    sections: [
      {
        heading: 'Understanding the Customer',
        paragraphs: [
          'Customers use Sendrey because they want a convenient, reliable, and stress-free way to complete errands. They expect their requests to be handled professionally, accurately, and on time.',
          'Every interaction you have with a customer reflects on Sendrey. A positive experience increases customer trust, encourages repeat business, and improves your ratings. A poor experience can result in complaints, lower ratings, and loss of future earning opportunities.'
        ]
      },
      {
        heading: 'Building Trust',
        paragraphs: ['Trust is built through consistency. Customers should always feel confident that you will:'],
        bullets: [
          'Follow their instructions.',
          'Handle their items with care.',
          'Respect their privacy.',
          'Communicate honestly.',
          'Complete errands professionally.'
        ]
      },
      {
        heading: 'Professional Behaviour',
        paragraphs: ['Always remain calm, respectful, and patient, even when customers are upset or frustrated.', 'Never:'],
        bullets: ['Raise your voice.', 'Argue.', 'Use abusive language.', 'Make assumptions.', 'Ignore customer concerns.']
      },
      {
        heading: 'Service Recovery',
        paragraphs: ['Mistakes happen. When they do:'],
        bullets: [
          'Acknowledge the issue.',
          'Apologize sincerely where appropriate.',
          'Explain the situation honestly.',
          'Offer a solution.',
          'Contact Sendrey Support if additional assistance is required.'
        ],
        tip: 'Customers are more likely to forgive a mistake than poor communication.'
      }
    ]
  },
  {
    title: 'Module 2: Professional Communication',
    objective: 'Learn how to communicate professionally before, during, and after every errand.',
    sections: [
      {
        paragraphs: [
          'Communication keeps customers informed and reduces misunderstandings.',
          'Every customer should know:'
        ],
        bullets: [
          "When you've accepted the task.",
          "When you've arrived.",
          "If there's a delay.",
          'If an item is unavailable.',
          'When the errand is complete.'
        ]
      },
      {
        heading: 'Responding Professionally',
        paragraphs: ['Use clear, polite, and respectful language.'],
        examples: [
          { label: 'good', text: "Good afternoon. I've arrived at the supermarket and will begin shopping shortly. I'll let you know if any requested item is unavailable." },
          { label: 'poor', text: 'Oya.' },
          { label: 'poor', text: 'Wait.' },
          { label: 'poor', text: 'I don reach.' }
        ]
      },
      {
        heading: 'When a Customer is Upset',
        paragraphs: ['Do not match the customer\u2019s emotions. Instead:'],
        bullets: [
          'Listen carefully.',
          'Remain respectful.',
          'Explain the situation calmly.',
          'Offer practical solutions.',
          'Escalate unresolved issues to Support.'
        ]
      },
      {
        heading: 'Communication Dos',
        bullets: ['Respond promptly.', 'Be polite.', 'Confirm instructions.', 'Keep customers updated.', 'Thank customers after completing errands.']
      },
      {
        heading: "Communication Don'ts",
        bullets: ['Ignore messages.', 'Use rude language.', 'Send one-word replies.', 'Lie about your location or progress.', 'End conversations abruptly.'],
        tip: 'Good communication builds trust. Poor communication creates complaints.'
      }
    ]
  },
  {
    title: 'Module 3: Your Health, Safety & Well-being',
    objective: 'Understand how to protect your health and work safely while completing errands.',
    sections: [
      {
        paragraphs: [
          'Your well-being is important to Sendrey. A healthy runner provides better service and is less likely to be involved in accidents.'
        ]
      },
      {
        heading: 'Taking Care of Yourself',
        paragraphs: ['Working long hours can be physically demanding, especially in Lagos traffic and weather conditions. To stay healthy:'],
        bullets: ['Drink enough water.', 'Eat balanced meals.', 'Get enough sleep.', 'Take short breaks during long shifts.', 'Stretch when possible.']
      },
      {
        heading: 'Ride Safely',
        paragraphs: ['Always:'],
        bullets: ['Wear your helmet.', 'Follow traffic laws.', 'Avoid speeding.', 'Keep your motorcycle roadworthy.', 'Never ride under the influence of alcohol or drugs.']
      },
      {
        heading: 'Know When to Stop',
        paragraphs: ['Do not continue working if you experience:'],
        bullets: ['Severe fatigue.', 'Dizziness.', 'Blurred vision.', 'Chest pain.', 'Illness that affects your ability to ride safely.', 'If you feel unwell, stop working and seek medical attention if necessary.'],
        tip: 'No delivery is more important than your life.'
      }
    ]
  },
  {
    title: 'Module 4: Professional Conduct & Disciplinary Policy',
    objective: 'Understand the standards expected of every runner and the consequences of misconduct.',
    sections: [
      {
        paragraphs: [
          'Sendrey is committed to providing customers with a safe and professional service. Every runner is expected to maintain high standards of behaviour at all times.',
          'Failure to meet these standards may result in disciplinary action.'
        ]
      },
      {
        heading: 'Minor Misconduct',
        paragraphs: ['These behaviours affect service quality and may result in warnings, retraining, or temporary account restrictions:'],
        bullets: ['Repeated lateness.', 'Poor communication.', 'Failure to provide updates.', 'Frequent task cancellations.', 'Failure to follow platform procedures.']
      },
      {
        heading: 'Major Misconduct',
        paragraphs: ['These behaviours may result in immediate suspension while an investigation is conducted:'],
        bullets: ['Aggressive behaviour.', 'Verbal abuse.', 'Threatening customers.', 'Harassment.', 'Intentionally damaging customer property.', 'Reckless riding.']
      },
      {
        heading: 'Gross Misconduct',
        paragraphs: ['These actions may result in permanent account termination and possible legal action:'],
        bullets: ['Fraud.', 'Theft.', 'Physical assault.', 'Sexual harassment.', 'Sharing customer information.', 'Forging receipts.', 'Collecting unauthorized payments.', 'Working under the influence of drugs or alcohol.']
      },
      {
        heading: 'Our Expectations',
        paragraphs: ['Every runner is expected to:'],
        bullets: ['Treat customers with respect.', 'Protect customer property.', 'Maintain confidentiality.', 'Act honestly.', "Follow Sendrey's policies.", 'Represent the Sendrey brand professionally.'],
        tip: 'Professional conduct protects both your reputation and the reputation of Sendrey.'
      }
    ]
  },
  {
    title: 'Final Declaration',
    sections: [
      {
        paragraphs: [
          'By completing this training and accepting errands on Sendrey, you agree to uphold the standards outlined in this handbook. You understand that maintaining professionalism, respecting customers, protecting their property, communicating effectively, and following Sendrey\u2019s policies are essential responsibilities of every runner.',
          'Failure to comply with these standards may result in warnings, suspension, permanent removal from the platform, or legal action where applicable.'
        ]
      }
    ]
  }
];

// ---- Small shared bits -----------------------------------------------------

const ProgressBar = ({ current, total }) => (
  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full bg-primary transition-all duration-300 ease-out"
      style={{ width: `${((current + 1) / total) * 100}%` }}
    />
  </div>
);

const ScreenHeader = ({ label, current, total, onExit }) => (
  <div className="px-5 pt-6 pb-4 bg-secondary flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <p className="text-gray-300 text-xs font-medium tracking-wide uppercase">
        {label} {current + 1} of {total}
      </p>
      <button
        type="button"
        onClick={onExit}
        className="p-1 -mr-1 text-primary transition-colors"
        aria-label="Exit training"
      >
        <X size={20} />
      </button>
    </div>
    <ProgressBar current={current} total={total} />
  </div>
);

const ExitConfirmModal = ({ darkMode, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-6">
    <div className={`w-full max-w-xs rounded-2xl p-5 ${darkMode ? 'bg-black-100 border border-white/10' : 'bg-white'}`}>
      <h3 className={`text-base font-bold mb-2 ${darkMode ? 'text-white' : 'text-black-100'}`}>
        Exit training?
      </h3>
      <p className={`text-sm mb-5 ${darkMode ? 'text-gray-300' : 'text-gray-400'}`}>
        Your progress will be saved. You can pick up right where you left off.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${darkMode ? 'border-white/20 text-gray-200' : 'border-gray-300 text-secondary'}`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary"
        >
          Exit
        </button>
      </div>
    </div>
  </div>
);

// Training
const TrainingView = ({ module, moduleIndex, totalModules, onNext, onBack, onExit, isFirstModule, isLastModule, darkMode }) => (
  <div className="flex flex-col h-full">
    <ScreenHeader label="Module" current={moduleIndex} total={totalModules} onExit={onExit} />

    <div className={`flex-1 overflow-y-auto px-5 py-6 ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
      <h1 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-black-100'}`}>{module.title}</h1>
      {module.objective && (
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>{module.objective}</p>
      )}

      <div className="space-y-6">
        {module.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h2 className={`font-semibold text-base mb-2 ${darkMode ? 'text-primary' : 'text-secondary'}`}>{section.heading}</h2>
            )}

            {section.paragraphs?.map((p, pi) => (
              <p key={pi} className={`text-sm leading-relaxed mb-2 ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>{p}</p>
            ))}

            {section.bullets && (
              <ul className="space-y-1.5 mt-2">
                {section.bullets.map((b, bi) => (
                  <li key={bi} className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
                    <span className="text-primary mr-2 mt-0.5">&#8226;</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {section.examples && (
              <div className="space-y-2 mt-2">
                {section.examples.map((ex, ei) => (
                  <div
                    key={ei}
                    className={`rounded-lg px-3 py-2 text-sm border ${
                      ex.label === 'good'
                        ? darkMode
                          ? 'bg-primary/10 border-primary/30 text-gray-100'
                          : 'bg-flash-white border-primary/30 text-black-100'
                        : darkMode
                          ? 'bg-white/5 border-white/10 text-gray-400'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                  >
                    <span className={`font-semibold mr-1 ${ex.label === 'good' ? 'text-primary' : 'text-gray-400'}`}>
                      {ex.label === 'good' ? 'Good example:' : 'Poor example:'}
                    </span>
                    {ex.text}
                  </div>
                ))}
              </div>
            )}

            {section.tip && (
              <div className={`mt-3 rounded-lg border px-3 py-2 ${darkMode ? 'bg-secondary/30 border-white/10' : 'bg-secondary/5 border-secondary/10'}`}>
                <p className={`text-sm font-medium ${darkMode ? 'text-primary' : 'text-secondary'}`}>
                  <span className="font-bold">Sendrey Tip: </span>
                  {section.tip}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    <div className={`px-5 py-4 border-t flex gap-3 ${darkMode ? 'bg-black-100 border-white/10' : 'bg-white border-gray-200'}`}>
      {!isFirstModule && (
        <button
          type="button"
          onClick={onBack}
          className={`px-5 py-3 rounded-xl text-sm font-semibold border ${darkMode ? 'text-gray-200 border-white/20' : 'text-secondary border-gray-300'}`}
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-primary active:opacity-90"
      >
        {isLastModule ? 'Start Test' : 'Continue'}
      </button>
    </div>
  </div>
);

// test
const TestView = ({ question, questionIndex, totalQuestions, selected, onSelect, onNext, onBack, onExit, isFirstQuestion, isLastQuestion, darkMode }) => (
  <div className="flex flex-col h-full">
    <ScreenHeader label="Question" current={questionIndex} total={totalQuestions} onExit={onExit} />

    <div className={`flex-1 overflow-y-auto px-5 py-6 ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
      <h1 className={`text-lg font-bold mb-6 ${darkMode ? 'text-white' : 'text-black-100'}`}>{question.question}</h1>

      <div className="space-y-3">
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                isSelected
                  ? darkMode
                    ? 'border-primary bg-primary/10 text-white font-medium'
                    : 'border-primary bg-primary/5 text-black-100 font-medium'
                  : darkMode
                    ? 'border-white/20 bg-black-100 text-gray-200'
                    : 'border-gray-300 bg-white text-black-100'
              }`}
            >
              <span className={`inline-block w-5 h-5 mr-3 rounded-full border align-middle ${
                isSelected ? 'border-primary bg-primary' : darkMode ? 'border-white/30' : 'border-gray-300'
              }`} />
              {option}
            </button>
          );
        })}
      </div>
    </div>

    <div className={`px-5 py-4 border-t flex gap-3 ${darkMode ? 'bg-black-100 border-white/10' : 'bg-white border-gray-200'}`}>
      {!isFirstQuestion && (
        <button
          type="button"
          onClick={onBack}
          className={`px-5 py-3 rounded-xl text-sm font-semibold border ${darkMode ? 'text-gray-200 border-white/20' : 'text-secondary border-gray-300'}`}
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={selected === undefined}
        className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-primary active:opacity-90 ${
          selected === undefined
            ? darkMode ? 'disabled:bg-white/10 disabled:text-gray-500' : 'disabled:bg-gray-300 disabled:text-gray-400'
            : ''
        }`}
      >
        {isLastQuestion ? 'Submit Test' : 'Next'}
      </button>
    </div>
  </div>
);

const ResultView = ({ score, passed, submitting, onContinue, onRetakeTraining, onRetakeTest, darkMode }) => (
  <div className={`flex flex-col h-full items-center justify-center px-6 text-center ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
      passed ? 'bg-primary/10' : darkMode ? 'bg-white/5' : 'bg-gray-100'
    }`}>
      <span className={`text-3xl ${passed ? 'text-primary' : darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
        {passed ? '\u2713' : '\u2715'}
      </span>
    </div>

    <h1 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-black-100'}`}>
      {passed ? 'Training Complete!' : "You didn't pass this time"}
    </h1>

    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>You scored</p>
    <p className={`text-3xl font-bold mb-4 ${passed ? 'text-primary' : darkMode ? 'text-gray-200' : 'text-secondary'}`}>{score}%</p>

    <p className={`text-sm mb-8 max-w-xs ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
      {passed
        ? 'You\u2019re ready to start accepting errands as a Sendrey Runner.'
        : `You need at least ${PASS_THRESHOLD}% to pass. Review the training material and try again.`}
    </p>

    {passed ? (
      <button
        type="button"
        onClick={onContinue}
        disabled={submitting}
        className="w-full max-w-xs py-3 rounded-xl text-sm font-semibold text-white bg-primary disabled:opacity-60"
      >
        {submitting ? 'Saving...' : 'Continue'}
      </button>
    ) : (
      <div className="w-full max-w-xs space-y-3">
        <button
          type="button"
          onClick={onRetakeTraining}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-primary"
        >
          Start Training Again
        </button>
        <button
          type="button"
          onClick={onRetakeTest}
          className={`w-full py-3 rounded-xl text-sm font-semibold border ${darkMode ? 'text-gray-200 border-white/20' : 'text-secondary border-gray-300'}`}
        >
          Retake Test
        </button>
      </div>
    )}
  </div>
);

// main
const RunnerTraining = ({ onComplete, submitting = false, darkMode = false, runnerId, onExit }) => {
  const persisted = loadProgress(runnerId);

  const [stage, setStage] = useState(() => persisted?.stage ?? 'training'); // 'training' | 'test' | 'result'
  const [moduleIndex, setModuleIndex] = useState(() => persisted?.moduleIndex ?? 0);
  const [questionIndex, setQuestionIndex] = useState(() => persisted?.questionIndex ?? 0);
  const [answers, setAnswers] = useState(() => persisted?.answers ?? {});
  const [score, setScore] = useState(() => persisted?.score ?? null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Persist on every change
  useEffect(() => {
    saveProgress(runnerId, { stage, moduleIndex, questionIndex, answers, score, isOpen: true });
  }, [runnerId, stage, moduleIndex, questionIndex, answers, score]);

  const currentModule = TRAINING_MODULES[moduleIndex];
  const isFirstModule = moduleIndex === 0;
  const isLastModule = moduleIndex === TRAINING_MODULES.length - 1;

  const handleNextModule = () => {
    if (isLastModule) {
      setQuestionIndex(0);
      setStage('test');
    } else {
      setModuleIndex((i) => i + 1);
    }
  };
  const handleBackModule = () => setModuleIndex((i) => Math.max(0, i - 1));

  const currentQuestion = runnerAssessment[questionIndex];
  const isFirstQuestion = questionIndex === 0;
  const isLastQuestion = questionIndex === runnerAssessment.length - 1;

  const handleSelectAnswer = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      submitTest();
    } else {
      setQuestionIndex((i) => i + 1);
    }
  };
  const handleBackQuestion = () => setQuestionIndex((i) => Math.max(0, i - 1));

  const submitTest = () => {
    const correct = runnerAssessment.reduce(
      (count, q) => (answers[q.id] === q.correctIndex ? count + 1 : count),
      0
    );
    const percentage = Math.round((correct / runnerAssessment.length) * 100);
    setScore(percentage);
    setStage('result');
  };

  const handleRetakeTraining = () => {
    setModuleIndex(0);
    setAnswers({});
    setScore(null);
    setStage('training');
  };

  const handleRetakeTest = () => {
    setQuestionIndex(0);
    setAnswers({});
    setScore(null);
    setStage('test');
  };

  const handleContinue = () => {
    onComplete?.(score);
    clearProgress(runnerId);
  };

  // resumes here without auto-popping back open on the next refresh.
  const handleExitClick = () => setShowExitConfirm(true);
  const handleExitCancel = () => setShowExitConfirm(false);
  const handleExitConfirm = () => {
    saveProgress(runnerId, { stage, moduleIndex, questionIndex, answers, score, isOpen: false });
    setShowExitConfirm(false);
    onExit?.();
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
      {stage === 'training' && (
        <TrainingView
          module={currentModule}
          moduleIndex={moduleIndex}
          totalModules={TRAINING_MODULES.length}
          onNext={handleNextModule}
          onBack={handleBackModule}
          onExit={handleExitClick}
          isFirstModule={isFirstModule}
          isLastModule={isLastModule}
          darkMode={darkMode}
        />
      )}

      {stage === 'test' && currentQuestion && (
        <TestView
          question={currentQuestion}
          questionIndex={questionIndex}
          totalQuestions={runnerAssessment.length}
          selected={answers[currentQuestion.id]}
          onSelect={handleSelectAnswer}
          onNext={handleNextQuestion}
          onBack={handleBackQuestion}
          onExit={handleExitClick}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          darkMode={darkMode}
        />
      )}

      {stage === 'result' && (
        <ResultView
          score={score}
          passed={score >= PASS_THRESHOLD}
          submitting={submitting}
          onContinue={handleContinue}
          onRetakeTraining={handleRetakeTraining}
          onRetakeTest={handleRetakeTest}
          darkMode={darkMode}
        />
      )}

      {showExitConfirm && (
        <ExitConfirmModal
          darkMode={darkMode}
          onCancel={handleExitCancel}
          onConfirm={handleExitConfirm}
        />
      )}
    </div>
  );
};

export default RunnerTraining;