import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { Button, Field, Modal, Notice, Tabs } from '../ui';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [screen, setScreen] = useState<'form' | 'confirm' | 'forgot'>('form');
  const [isSignUp, setIsSignUp] = useState(false);

  const title =
    screen === 'confirm' ? t('auth.confirmTitle') : screen === 'forgot' ? t('auth.resetTitle') : isSignUp ? t('auth.signUp') : t('auth.logIn');

  return (
    <Modal title={title} onClose={onClose} hideTitle={screen === 'form'}>
      {screen === 'form' && (
        <div className="auth-screen">
          <Tabs
            label={t('auth.mode')}
            idPrefix="auth"
            value={isSignUp ? 'signup' : 'login'}
            onChange={(v) => setIsSignUp(v === 'signup')}
            items={[
              { id: 'login', label: t('auth.logIn') },
              { id: 'signup', label: t('auth.signUp') },
            ]}
          />

          <form
            style={{ marginTop: 20 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (isSignUp) setScreen('confirm');
              else {
                alert('Logged in successfully!');
                onClose();
              }
            }}
          >
            <Field label={t('checkout.email')} required>
              <input type="email" required autoComplete="email" className="text-input" placeholder="name@domain.com" />
            </Field>
            <Field label={t('auth.password')} required>
              <input type="password" required autoComplete={isSignUp ? 'new-password' : 'current-password'} className="text-input" placeholder="••••••••" />
            </Field>
            <div className="form-group-link">
              <a href="#forgot" onClick={(e) => { e.preventDefault(); setScreen('forgot'); }}>
                {t('auth.forgot')}
              </a>
            </div>
            <Button type="submit" full>
              {isSignUp ? t('auth.create') : t('auth.logIn')}
            </Button>
          </form>
        </div>
      )}

      {screen === 'confirm' && (
        <div className="auth-screen">
          <Notice tone="info">{t('auth.confirmBody')}</Notice>
          <Button full onClick={() => setScreen('form')} className="" style={{ marginTop: 16 }}>
            {t('auth.backToLogin')}
          </Button>
        </div>
      )}

      {screen === 'forgot' && (
        <div className="auth-screen">
          <p className="modal-desc">{t('auth.resetDesc')}</p>
          <form onSubmit={(e) => { e.preventDefault(); setScreen('form'); }}>
            <Field label={t('checkout.email')} required>
              <input type="email" required autoComplete="email" className="text-input" placeholder="name@domain.com" />
            </Field>
            <Button type="submit" full>
              {t('auth.sendLink')}
            </Button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button type="button" className="link-btn" onClick={() => setScreen('form')}>
                {t('auth.backToLogin')}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
};
