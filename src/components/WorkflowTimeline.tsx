import React from 'react';

interface TimelineProps {
  steps: {
    id: number;
    step_number: number;
    signoff_person?: string;
    signoff_status: string;
    signoff_date?: string;
    remarks?: string;
  }[];
  currentStep: number;
  stepLabels: string[];
  stepTeamFlow: string[];
}

const WorkflowTimeline: React.FC<TimelineProps> = ({ 
  steps, 
  currentStep, 
  stepLabels, 
  stepTeamFlow 
}) => {
  return (
    <div className="mt-6 mb-10 relative">
      {/* Timeline Track */}
      <div className="absolute top-6 left-0 right-0 h-1 bg-gray-300 z-0"></div>
      
      {/* Timeline Steps */}
      <div className="flex justify-between relative z-10">
        {stepLabels.filter((_, idx) => idx > 0).map((label, idx) => {
          const stepNumber = idx + 1;
          const step = steps.find(s => s.step_number === stepNumber);
          const isCompleted = step?.signoff_status === 'Approved';
          const isCurrent = currentStep === stepNumber;
          const isPending = !isCompleted && !isCurrent;
          
          return (
            <div key={stepNumber} className="flex flex-col items-center px-2" style={{width: `${100 / 8}%`, minWidth: '150px'}}>
              {/* Step Circle */}
              <div 
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center font-bold text-white mb-2
                  ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                  transition-all duration-300 shadow-md
                `}
              >
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepNumber}
              </div>
              
              {/* Step Label */}
              <div className="text-xs font-medium text-center" style={{minHeight: '2.5rem'}}>
                {label}
              </div>
              
              {/* Step Team Flow */}
              <div className="text-xs text-gray-500 text-center mb-1">
                {stepTeamFlow[stepNumber]}
              </div>
              
              {/* Step Status */}
              <div className={`
                text-xs px-2 py-1 rounded-full mb-1 
                ${isCompleted ? 'bg-green-100 text-green-800' : isCurrent ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}
              `}>
                {step?.signoff_status || 'Pending'}
              </div>
              
              {/* Signoff Person and Date (if completed) */}
              {isCompleted && step?.signoff_person && (
                <div className="text-xs text-gray-600 text-center">
                  <div>{step.signoff_person}</div>
                  <div>{step.signoff_date ? new Date(step.signoff_date).toLocaleDateString() : ''}</div>
                  {step.remarks && <div className="italic">"{step.remarks}"</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowTimeline;
