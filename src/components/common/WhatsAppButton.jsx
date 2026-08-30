import React from 'react';
import { MessageCircle } from 'lucide-react';
import './WhatsAppButton.css';

export default function WhatsAppButton() {
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';
  const defaultMessage = encodeURIComponent('Hi Nathshikha Studio, I have an inquiry about your Maharashtrian jewellery.');

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${defaultMessage}`}
      className="globalFloatingWhatsApp"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp with Nathshikha Studio"
      title="Chat on WhatsApp (+91 9699668421)"
    >
      <div className="whatsAppIconCircle">
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="currentColor"
          className="waSvgIcon"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.77.814 2.797.815 3.179 0 5.767-2.587 5.768-5.766 0-3.18-2.588-5.767-5.769-5.767zm3.398 8.163c-.143.404-.834.77-1.169.818-.335.048-.77.069-1.246-.086-.713-.233-1.631-.736-2.529-1.53-.984-.869-1.599-1.92-1.848-2.338-.25-.418-.027-.643.116-.786.129-.129.286-.334.429-.501.143-.167.19-.286.286-.476.095-.19.048-.357-.024-.5-.071-.143-.643-1.547-.881-2.118-.232-.556-.468-.48-.643-.489-.166-.008-.357-.01-.548-.01-.19 0-.5.071-.762.357-.262.286-1 .976-1 2.38 0 1.405 1.024 2.762 1.167 2.952.143.19 2.016 3.078 4.887 4.316.683.295 1.216.471 1.632.603.687.219 1.312.188 1.807.114.551-.082 1.696-.693 1.934-1.362.238-.669.238-1.242.167-1.362-.071-.12-.262-.19-.548-.333z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.527 3.66 1.443 5.176L2 22l4.98-1.306C8.423 21.528 10.154 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.167c-1.697 0-3.272-.512-4.588-1.39l-.329-.221-3.036.796.81-2.957-.243-.387C3.655 14.654 3.167 13.364 3.167 12c0-4.87 3.963-8.833 8.833-8.833 4.87 0 8.833 3.963 8.833 8.833 0 4.87-3.963 8.833-8.833 8.833z" />
        </svg>
      </div>
      <div className="floatingWhatsAppTooltip">
        <span>Chat on WhatsApp</span>
        <small>+91 9699668421</small>
      </div>
    </a>
  );
}
