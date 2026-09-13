import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ShoppingBag, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './CheckoutSteps.css';

export default function CheckoutSteps({ currentStep = 1 }) {
  const { t } = useLanguage();

  const steps = [
    {
      num: 1,
      title: t('step_bag', 'Shopping Bag'),
      path: '/cart'
    },
    {
      num: 2,
      title: t('step_checkout', 'Delivery & Payment'),
      path: '/checkout'
    },
    {
      num: 3,
      title: t('step_confirmation', 'Confirmation'),
      path: null
    }
  ];

  return (
    <nav className="checkoutStepsContainer" aria-label="Checkout Progress">
      <div className="checkoutStepsList">
        {steps.map((step, idx) => {
          const isCompleted = step.num < currentStep;
          const isActive = step.num === currentStep;
          const isClickable = isCompleted && Boolean(step.path);

          const StepTag = isClickable ? Link : 'div';
          const stepProps = isClickable ? { to: step.path } : {};

          return (
            <React.Fragment key={step.num}>
              <StepTag
                className={`stepItem ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
                {...stepProps}
              >
                <div className="stepBubble">
                  {isCompleted ? <Check size={16} /> : step.num}
                </div>
                <span className="stepTitle">{step.title}</span>
              </StepTag>

              {idx < steps.length - 1 && (
                <div
                  className={`stepConnector ${step.num < currentStep ? 'completed' : ''}`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
