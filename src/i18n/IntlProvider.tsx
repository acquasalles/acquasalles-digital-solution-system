import React from 'react';
import { IntlProvider as ReactIntlProvider } from 'react-intl';
import ptBR from './messages/pt-BR';
import enUS from './messages/en-US';

const messages = {
  'pt-BR': ptBR,
  'en-US': enUS
};

interface IntlProviderProps {
  children: React.ReactNode;
}

export function IntlProvider({ children }: IntlProviderProps) {
  // For now, we'll default to Portuguese
  const locale = 'pt-BR';

  return (
    <ReactIntlProvider
      messages={messages[locale as keyof typeof messages]}
      locale={locale}
      defaultLocale="pt-BR"
    >
      {children}
    </ReactIntlProvider>
  );
}