import { Background, BorderLinearProgress, Core, Icons, Theme } from '@mb3r/component-library';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { ContentCardBack, ContentCardFront, EmptyDeckCard, useContentCard } from './components/ContentCard';
import CreateMeDialog, { useCreateMeDialog } from './components/CreateMeDialog';
import LanguageDropdownInput from './components/LanguageDropdownInput';
import Logo from './components/Logo';
import SettingsMenu, { useSettingsMenu } from './components/SettingsMenu';
import * as queries from './queries';

import './main.css';

const DEFAULT_VOICE_SPEED = 80;

const App = () => {
  const settings = useSettingsMenu();
  const createMeDialog = useCreateMeDialog();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<boolean>(false);
  const [subject, setSubject] = React.useState<string>('');
  const cardContent = useContentCard();
  const [isEmptyDeck, setIsEmptyDeck] = React.useState<'New' | 'Review' | undefined>(undefined);
  const cardProgress =
    cardContent && cardContent.card && cardContent.cards.length
      ? ((cardContent.cards.indexOf(cardContent.card) + 1) / (cardContent.cards.length + 1)) * 100
      : 0;

  // clears deck on language change
  useEffect(() => {
    cardContent.resetDeck();
  }, [settings.learningLanguage]);

  const fetchNewWords = async () => {
    setLoading(true);
    setError(false);

    const { data, error } = await queries.cards.generateNew(subject, settings.learningLanguage, settings.token);

    if (error || !data || !data.cards) {
      setError(true);
      setLoading(false);
      return;
    }

    cardContent.setCards(data.cards);
    setLoading(false);
  };

  const fetchSeenCards = async () => {
    setLoading(true);
    setError(false);
    setIsEmptyDeck(undefined);
    cardContent.resetDeck();

    const { data, error } = await queries.cards.getReview(settings.username, settings.learningLanguage);
    if (error || !data || !data.cards) {
      setError(true);
      setLoading(false);
      return;
    }

    if (data.cards.length === 0) {
      setIsEmptyDeck('Review');
    } else {
      cardContent.setCards(data.cards);
    }
    setLoading(false);
  };

  const fetchRandomCards = async () => {
    setLoading(true);
    setError(false);
    setIsEmptyDeck(undefined);
    cardContent.resetDeck();

    const { data, error } = await queries.cards.getNew(settings.username, settings.learningLanguage);
    if (error || !data || !data.cards) {
      setError(true);
      setLoading(false);
      return;
    }

    if (data.cards.length === 0) {
      setIsEmptyDeck('New');
    } else {
      cardContent.setCards(data.cards);
    }
    setLoading(false);
  };

  const onRateCard = async (cardId: number, correct: boolean, rating: number) => {
    setError(false);

    const { data, error } = await queries.cards.postReviewRating(settings.username, cardId, correct, rating);

    if (error && data && data.detail && data.detail === 'User not found') {
      createMeDialog.toggle(true);
      return;
    } else if (error || !data) {
      setError(true);
      return;
    }

    cardContent.nextCard();
  };

  return (
    <Theme.Provider mode={settings.themeMode === null ? 'dark' : (settings.themeMode as 'dark' | 'light')}>
      <React.Fragment>
        <Core.CssBaseline />
        <div
          style={{
            height: '100%',
            minHeight: '100vh',
            width: '100vw',
            position: 'absolute',
            backgroundColor:
              settings.themeMode === null ? 'dark' : settings.themeMode === 'dark' ? '#0f1011' : '#F8FAF6',
            zIndex: 0,
          }}
        >
          <Background.Surface>
            <Background.ContourMapSVG size={1000} />
          </Background.Surface>

          <Core.Box>
            <Core.AppBar
              position="static"
              sx={{
                bgcolor: 'transparent',
                boxShadow: 3,
                backdropFilter:
                  settings.themeMode === 'dark' ? 'blur(3px) brightness(60%) ' : 'blur(3px) brightness(100%)',
              }}
            >
              <Core.Toolbar>
                <Logo />
                <Core.Typography
                  variant="h6"
                  component="div"
                  sx={{
                    flexGrow: 1,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '.3rem',
                    color: settings.themeMode === 'dark' ? '#F8FAF6' : '#0f1011',
                    textDecoration: 'none',
                  }}
                >
                  RICOTTA
                </Core.Typography>
              </Core.Toolbar>
              <Core.IconButton
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  color: settings.themeMode === 'dark' ? '#F8FAF6' : '#0f1011',
                }}
                aria-label="settings"
                onClick={(event: React.MouseEvent<HTMLElement>) => {
                  settings.setAnchorEl(event.currentTarget);
                }}
              >
                <Icons.Settings />
              </Core.IconButton>
              <SettingsMenu {...settings} />
            </Core.AppBar>
          </Core.Box>

          <Core.Container maxWidth="sm">
            <Core.Card
              elevation={1}
              sx={{
                mt: 8,
                p: 2,
              }}
            >
              <Core.Typography
                gutterBottom
                variant="h6"
                component="div"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '.1rem',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                Language level-up
              </Core.Typography>
              <Core.Divider sx={{ mx: -2 }} />

              <Core.Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', my: 2 }}>
                <LanguageDropdownInput {...settings} hiddenLabel />
              </Core.Box>

              <Core.Grid container spacing={2}>
                <Core.Grid xs={6} item>
                  <Core.Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={fetchRandomCards}
                    disabled={loading}
                  >
                    Learn
                    {loading && (
                      <Core.CircularProgress
                        size={15}
                        sx={{
                          ml: 1,
                        }}
                      />
                    )}
                  </Core.Button>
                </Core.Grid>
                <Core.Grid xs={6} item>
                  <Core.Button variant="outlined" color="primary" fullWidth onClick={fetchSeenCards} disabled={loading}>
                    Study
                    {loading && (
                      <Core.CircularProgress
                        size={15}
                        sx={{
                          ml: 1,
                        }}
                      />
                    )}
                  </Core.Button>
                </Core.Grid>

                <Core.Grid xs={12} item>
                  <Core.Divider variant="middle" sx={{ my: 2 }} />
                </Core.Grid>

                <Core.Grid xs={9} item>
                  <Core.TextField
                    label={'Learn words about...'}
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)}
                    disabled={!settings.token}
                    sx={{
                      opacity: settings.token ? 1 : 0.3,
                    }}
                  />
                  {!settings.token && (
                    <Core.Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', opacity: 0.5, mt: 1 }}>
                      <Icons.Info
                        fontSize="small"
                        sx={{
                          width: 15,
                          mr: 1,
                        }}
                      />
                      <Core.Typography variant="caption" component="p" align="left" small>
                        Add OpenAI key in settings to enable this feature
                      </Core.Typography>
                    </Core.Box>
                  )}
                </Core.Grid>
                <Core.Grid xs={3} item>
                  <Core.Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={fetchNewWords}
                    disabled={loading || !settings.token}
                    sx={{
                      opacity: settings.token ? 1 : 0.3,
                    }}
                  >
                    Generate
                    {loading && settings.token && (
                      <Core.CircularProgress
                        size={15}
                        sx={{
                          ml: 2,
                        }}
                      />
                    )}
                  </Core.Button>
                </Core.Grid>
              </Core.Grid>
            </Core.Card>
          </Core.Container>

          <Core.Container maxWidth="sm" sx={{ pb: 6 }}>
            {cardContent.card && (
              <BorderLinearProgress
                sx={{
                  mt: 3,
                  mb: 0,
                }}
                value={cardProgress}
              />
            )}
            {cardContent.card && cardContent.answered === 'pending' && (
              <ContentCardFront
                {...cardContent}
                learningLanguage={settings.learningLanguage}
                voiceSpeed={DEFAULT_VOICE_SPEED}
                voice={settings.voice}
              />
            )}

            {cardContent.card && cardContent.answered !== 'pending' && (
              <ContentCardBack
                {...cardContent}
                learningLanguage={settings.learningLanguage}
                voiceSpeed={DEFAULT_VOICE_SPEED}
                onRateCard={onRateCard}
                voice={settings.voice}
              />
            )}

            {isEmptyDeck && <EmptyDeckCard state={isEmptyDeck} />}
          </Core.Container>

          {error && (
            <Core.Container maxWidth="sm" sx={{ mt: 3 }}>
              <Core.Alert variant="outlined" severity="error" sx={{ bgcolor: '#f4433640', borderColor: '#f44336' }}>
                Oops, something went wrong. Please refresh the page and try again.
              </Core.Alert>
            </Core.Container>
          )}

          <CreateMeDialog
            open={createMeDialog.open}
            toggle={createMeDialog.toggle}
            username={settings.username ?? ''}
            callback={cardContent.nextCard}
          />
        </div>
      </React.Fragment>
    </Theme.Provider>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
