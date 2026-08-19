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

const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const TRAINING_MODULES = [
  {
    title: 'Welcome to Sendrey Runner Course',
    overview: 'Why this training matters and what\u2019s expected of you as a runner.',
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
    overview: 'How to build trust, behave professionally, and recover well from mistakes.',
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
    overview: 'Keeping customers informed, handling upset customers, and communication dos and don\u2019ts.',
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
    overview: 'Staying healthy on shift, riding safely, and knowing when to stop working.',
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
    overview: 'What counts as minor, major, and gross misconduct, and what\u2019s expected of you.',
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
    overview: 'What you\u2019re agreeing to by accepting errands on Sendrey.',
    sections: [
      {
        paragraphs: [
          'By completing this training and accepting errands on Sendrey, you agree to uphold the standards outlined in this handbook. You understand that maintaining professionalism, respecting customers, protecting their property, communicating effectively, and following Sendrey\u2019s policies are essential responsibilities of every runner.',
          'Failure to comply with these standards may result in warnings, suspension, permanent removal from the platform, or legal action where applicable.',
          'When you are done, click the button below to begin your assessment.'
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
      <p className={`text-sm mb-5 ${darkMode ? 'text-gray-300' : 'text-black-100/70'}`}>
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

// Intro / overview
const IntroView = ({ onStart, onExit, darkMode }) => (
  <div className="flex flex-col h-full">
    <div className="px-5 pt-6 pb-4 bg-secondary flex items-center justify-between">
      <p className="text-gray-300 text-xs font-medium tracking-wide uppercase">Runner Course</p>
      <button
        type="button"
        onClick={onExit}
        className="p-1 -mr-1 text-primary transition-colors"
        aria-label="Exit training"
      >
        <X size={20} />
      </button>
    </div>

    <div className={`flex-1 overflow-y-auto px-5 py-6 ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
      <h1 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-black-100'}`}>What will I Learn?</h1>
      <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-black-100/60'}`}>
        About Sendrey and other guidelines
      </p>

      <div className="space-y-3">
        {TRAINING_MODULES.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
              darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div>
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-black-100'}`}>{m.title}</p>
              {m.overview && (
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-black-100/60'}`}>{m.overview}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={`px-5 py-4 border-t ${darkMode ? 'bg-black-100 border-white/10' : 'bg-white border-gray-200'}`}>
      <button
        type="button"
        onClick={onStart}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-primary active:opacity-90"
      >
        Start Training
      </button>
    </div>
  </div>
);

// Training
const TrainingView = ({ module, moduleIndex, totalModules, onNext, onBack, onExit, isLastModule, darkMode }) => {
  // Check if this is the Final Declaration module
  const isFinalDeclaration = module.title === 'Final Declaration';
  
  return (
    <div className="flex flex-col h-full">
      <ScreenHeader label="Module" current={moduleIndex} total={totalModules} onExit={onExit} />

      <div className={`flex-1 overflow-y-auto px-5 py-6 ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
        <h1 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-black-100'}`}>{module.title}</h1>
        {module.objective && (
          <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-black-100/60'}`}>{module.objective}</p>
        )}

        <div className="space-y-6">
          {module.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h2 className={`font-semibold text-base mb-2 ${darkMode ? 'text-primary' : 'text-secondary'}`}>{section.heading}</h2>
              )}

              {section.paragraphs?.map((p, pi) => {
                // Check if this is the "When you are done" paragraph in Final Declaration
                const isCallToAction = isFinalDeclaration && p.includes('click the button below');
                return (
                  <p 
                    key={pi} 
                    className={`leading-relaxed mb-2 ${
                      isCallToAction 
                        ? `text-xl flex justify-center font-semibold ${darkMode ? 'text-primary' : 'text-secondary'} mt-10` 
                        : `text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`
                    }`}
                  >
                    {p}
                  </p>
                );
              })}

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
                            : 'bg-gray-100 border-gray-300 text-black-100/70'
                      }`}
                    >
                      <span className={`font-semibold mr-1 ${ex.label === 'good' ? 'text-primary' : darkMode ? 'text-gray-500' : 'text-black-100/60'}`}>
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
        <button
          type="button"
          onClick={onBack}
          className={`px-5 py-3 rounded-xl text-sm font-semibold border ${darkMode ? 'text-gray-200 border-white/20' : 'text-secondary border-gray-300'}`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-primary active:opacity-90"
        >
          {/* {isLastModule ? 'Start Test' : 'Continue'} */}
          continue
        </button>
      </div>
    </div>
  );
};

// Pre-test instruction page
const PreTestView = ({ onStartTest, onBack, onExit, darkMode }) => (
  <div className="flex flex-col h-full">
    <ScreenHeader label="Pre-Test" current={0} total={1} onExit={onExit} />

    <div className={`flex-1 overflow-y-auto px-5 py-6 ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
      <div className="max-w-2xl mx-auto">
        <h1 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-black-100'}`}>
          Ready for the Test?
        </h1>
        <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-black-100/60'}`}>
          Test your knowledge before you start accepting errands
        </p>

        <div className={`rounded-xl border p-5 mb-6 ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
          <h2 className={`font-semibold text-base mb-3 ${darkMode ? 'text-primary' : 'text-secondary'}`}>
            What to expect
          </h2>
          <ul className="space-y-2">
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span><strong className="font-semibold">Questions:</strong> 25 multiple-choice questions covering all six modules</span>
            </li>
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span><strong className="font-semibold">Passing score:</strong> 80% </span>
            </li>
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span><strong className="font-semibold">Time limit:</strong> No time limit — take your time</span>
            </li>
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span><strong className="font-semibold">Retakes:</strong> You can retake the test if you don't pass</span>
            </li>
          </ul>
        </div>

        <div className={`rounded-xl border p-5 mb-6 ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
          <h2 className={`font-semibold text-base mb-3 ${darkMode ? 'text-primary' : 'text-secondary'}`}>
            Tips before you start
          </h2>
          <ul className="space-y-2">
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span>Review the training modules if you need a refresher</span>
            </li>
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span>Read each question carefully before answering</span>
            </li>
            <li className={`flex items-start text-sm ${darkMode ? 'text-gray-200' : 'text-black-100'}`}>
              <span className="text-primary mr-2">•</span>
              <span>You can go back and change your answers before submitting</span>
            </li>
          </ul>
        </div>

        <div className={`rounded-lg border px-4 py-3 ${darkMode ? 'bg-secondary/30 border-white/10' : 'bg-secondary/5 border-secondary/10'}`}>
          <p className={`text-sm ${darkMode ? 'text-primary' : 'text-secondary'}`}>
            <span className="font-bold">💡 Note:</span> This test helps ensure you understand the key concepts needed to be a successful Sendrey Runner.
          </p>
        </div>
      </div>
    </div>

    <div className={`px-5 py-4 border-t flex gap-3 ${darkMode ? 'bg-black-100 border-white/10' : 'bg-white border-gray-200'}`}>
      <button
        type="button"
        onClick={onBack}
        className={`px-5 py-3 rounded-xl text-sm font-semibold border ${darkMode ? 'text-gray-200 border-white/20' : 'text-secondary border-gray-300'}`}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onStartTest}
        className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-primary active:opacity-90"
      >
        Start Test
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

    <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-black-100/60'}`}>You scored</p>
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

  const [stage, setStage] = useState(() => persisted?.stage ?? 'intro'); // 'intro' | 'training' | 'pre-test' | 'test' | 'result'
  const [moduleIndex, setModuleIndex] = useState(() => persisted?.moduleIndex ?? 0);
  const [questionIndex, setQuestionIndex] = useState(() => persisted?.questionIndex ?? 0);
  const [answers, setAnswers] = useState(() => persisted?.answers ?? {});
  const [score, setScore] = useState(() => persisted?.score ?? null);
  const [questionOrder, setQuestionOrder] = useState(() => persisted?.questionOrder ?? null); // array of question ids, shuffled per test attempt
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Persist on every change
  useEffect(() => {
    saveProgress(runnerId, { stage, moduleIndex, questionIndex, answers, score, questionOrder, isOpen: true });
  }, [runnerId, stage, moduleIndex, questionIndex, answers, score, questionOrder]);

  const currentModule = TRAINING_MODULES[moduleIndex];
  const isLastModule = moduleIndex === TRAINING_MODULES.length - 1;

  const handleStartTraining = () => setStage('training');

  const handleNextModule = () => {
    if (isLastModule) {
      setStage('pre-test');
    } else {
      setModuleIndex((i) => i + 1);
    }
  };
  
  const handleBackModule = () => {
    if (moduleIndex === 0) {
      setStage('intro');
    } else {
      setModuleIndex((i) => i - 1);
    }
  };

  const handleStartTest = () => {
    setQuestionOrder(shuffleArray(runnerAssessment.map((q) => q.id)));
    setQuestionIndex(0);
    setAnswers({});
    setScore(null);
    setStage('test');
  };

  const handleBackToTraining = () => {
    setStage('training');
  };

  // Questions in this attempt's shuffled order (falls back to natural order if none set yet)
  const orderedQuestions = questionOrder
    ? questionOrder.map((id) => runnerAssessment.find((q) => q.id === id)).filter(Boolean)
    : runnerAssessment;

  const currentQuestion = orderedQuestions[questionIndex];
  const isFirstQuestion = questionIndex === 0;
  const isLastQuestion = questionIndex === orderedQuestions.length - 1;

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
    const correct = orderedQuestions.reduce(
      (count, q) => (answers[q.id] === q.correctIndex ? count + 1 : count),
      0
    );
    const percentage = Math.round((correct / orderedQuestions.length) * 100);
    setScore(percentage);
    setStage('result');
  };

  const handleRetakeTraining = () => {
    setModuleIndex(0);
    setAnswers({});
    setScore(null);
    setQuestionOrder(null);
    setStage('training');
  };

  const handleRetakeTest = () => {
    setQuestionOrder(shuffleArray(runnerAssessment.map((q) => q.id)));
    setQuestionIndex(0);
    setAnswers({});
    setScore(null);
    setStage('pre-test');
  };

  const handleContinue = () => {
    onComplete?.(score);
    clearProgress(runnerId);
  };

  const handleExitClick = () => setShowExitConfirm(true);
  const handleExitCancel = () => setShowExitConfirm(false);
  const handleExitConfirm = () => {
    saveProgress(runnerId, { stage, moduleIndex, questionIndex, answers, score, questionOrder, isOpen: false });
    setShowExitConfirm(false);
    onExit?.();
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${darkMode ? 'bg-black-100' : 'bg-white'}`}>
      {stage === 'intro' && (
        <IntroView onStart={handleStartTraining} onExit={handleExitClick} darkMode={darkMode} />
      )}

      {stage === 'training' && (
        <TrainingView
          module={currentModule}
          moduleIndex={moduleIndex}
          totalModules={TRAINING_MODULES.length}
          onNext={handleNextModule}
          onBack={handleBackModule}
          onExit={handleExitClick}
          isLastModule={isLastModule}
          darkMode={darkMode}
        />
      )}

      {stage === 'pre-test' && (
        <PreTestView
          onStartTest={handleStartTest}
          onBack={handleBackToTraining}
          onExit={handleExitClick}
          darkMode={darkMode}
        />
      )}

      {stage === 'test' && currentQuestion && (
        <TestView
          question={currentQuestion}
          questionIndex={questionIndex}
          totalQuestions={orderedQuestions.length}
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