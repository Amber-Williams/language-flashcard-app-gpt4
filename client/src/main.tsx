import { Background, BorderLinearProgress, Core, Icons, Theme } from '@mb3r/component-library';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { ContentCardBack, ContentCardFront, EmptyDeckCard, useContentCard } from './components/ContentCard';
import CreateMeDialog, { useCreateMeDialog } from './components/CreateMeDialog';
import LanguageDropdownInput from './components/LanguageDropdownInput';
import Logo from './components/Logo';
import SettingsMenu, { useSettingsMenu } from './components/SettingsMenu';
import StudyToggle from './components/StudyToggle';
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
  const [fetchDueDeckCache, setFetchDueDeckCache] = React.useState<
    | undefined
    | {
        cards: queries.ICard[];
        dueCards: queries.ICard[];
      }
  >();

  const [deckType, setDeckType] = React.useState<'New' | 'Review' | undefined>(undefined);
  const [studyToggleTab, setStudyToggleTab] = React.useState<'Due' | 'All'>('Due');
  const cardProgress =
    cardContent && cardContent.card && cardContent.cards.length
      ? ((cardContent.cards.indexOf(cardContent.card) + 1) / (cardContent.cards.length + 1)) * 100
      : 0;

  // clears deck on language change
  useEffect(() => {
    cardContent.resetDeck();
    setDeckType(undefined);
  }, [settings.learningLanguage]);

  // set review deck on due toggle change
  useEffect(() => {
    if (deckType === 'Review' && studyToggleTab === 'Due') {
      cardContent.setCards(fetchDueDeckCache?.dueCards ?? []);
    } else if (deckType === 'Review' && studyToggleTab === 'All') {
      cardContent.setCards(fetchDueDeckCache?.cards ?? []);
    }
  }, [studyToggleTab]);

  const generateNewDeck = async () => {
    setLoading(true);
    setError(false);

    const { data, error } = await queries.cards.generateNew(subject, settings.learningLanguage, settings.token);

    if (error || !data || !data.cards) {
      setError(true);
      setLoading(false);
      return;
    }
    setDeckType('New');
    cardContent.setCards(data.cards);
    setLoading(false);
  };

  const fetchDueDeck = async () => {
    setLoading(true);
    setError(false);
    setDeckType(undefined);
    cardContent.resetDeck();

    const { data, error } = await queries.cards.getReview(settings.username, settings.learningLanguage);
    if (error || !data || !data.cards) {
      setError(true);
      setLoading(false);
      return;
    }

    setFetchDueDeckCache({
      cards: data.cards,
      dueCards: data.dueCards,
    });
    setDeckType('Review');
    if (studyToggleTab === 'Due') {
      cardContent.setCards(data.dueCards);
    } else if (studyToggleTab === 'All') {
      cardContent.setCards(data.cards);
    }
    setLoading(false);
  };

  const fetchNewDeck = async () => {
    setLoading(true);
    setError(false);
    setDeckType(undefined);
    cardContent.resetDeck();

    const { data, error } = await queries.cards.getNew(settings.username, settings.learningLanguage);
    if (error || !data || !data.cards) {
      setError(true);
      setLoading(false);
      return;
    }

    if (data.cards.length > 0) {
      cardContent.setCards(data.cards);
    }
    setDeckType('New');
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

    if (!data.isDue && fetchDueDeckCache?.dueCards) {
      // remove card from due deck
      const newDueCards = fetchDueDeckCache.dueCards.filter((c) => c.id !== cardId);
      setFetchDueDeckCache({
        ...fetchDueDeckCache,
        dueCards: newDueCards,
      });
    } else if (data.isDue && studyToggleTab === 'All' && fetchDueDeckCache?.cards) {
      // add card to due deck when answered wrong and is reviewing all cards
      if (!fetchDueDeckCache.dueCards.find((c) => c.id === cardId)) {
        const card = fetchDueDeckCache.cards.find((c) => c.id === cardId);
        if (card) {
          const newDueCards = structuredClone(fetchDueDeckCache.dueCards);
          newDueCards.push(card);
          setFetchDueDeckCache({
            ...fetchDueDeckCache,
            dueCards: newDueCards,
          });
        }
      }
    }

    if (deckType === 'Review' && studyToggleTab === 'Due') {
      cardContent.nextCard(fetchDueDeck);
    } else {
      cardContent.nextCard();
    }
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
              sx={(theme: typeof Theme.useTheme) => ({
                mt: 8,
                p: 2,
                [theme.breakpoints.only('xs')]: {
                  mt: 2,
                },
              })}
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
                  <Core.Button variant="outlined" color="secondary" fullWidth onClick={fetchNewDeck} disabled={loading}>
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
                  <Core.Button variant="outlined" color="primary" fullWidth onClick={fetchDueDeck} disabled={loading}>
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
              </Core.Grid>
            </Core.Card>
            <Core.Accordion sx={{ mt: -1 }}>
              <Core.AccordionSummary
                expandIcon={<Icons.ExpandMore />}
                aria-controls="panel3-content"
                id="panel3-header"
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                Generate new words with AI
              </Core.AccordionSummary>
              <Core.AccordionDetails>
                <Core.Grid container spacing={2}>
                  <Core.Grid xs={12} md={9} item>
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
                      <Core.Box
                        sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', opacity: 0.5, mt: 1 }}
                      >
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
                  <Core.Grid xs={12} md={3} item>
                    <Core.Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={generateNewDeck}
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
                  <Core.Grid xs={12} item>
                    <Core.Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
                      <Core.AlertTitle>How is my data used?</Core.AlertTitle>
                      OpenAI's chat API is used generate 5 new cards based on the subject you provide. Content you
                      generate will available for other users to learn from. <b>Your keys are never stored.</b>
                      <br />
                      <br />
                      It is recommended to invalidate keys in your OpenAI account after each session when using
                      third-party applications like this app.
                    </Core.Alert>
                  </Core.Grid>
                </Core.Grid>
              </Core.AccordionDetails>
            </Core.Accordion>
          </Core.Container>

          <Core.Container maxWidth="sm" sx={{ pb: 6 }}>
            {deckType === 'Review' && (
              <StudyToggle
                setStudyToggleTab={setStudyToggleTab}
                studyToggleTab={studyToggleTab}
                dueCount={fetchDueDeckCache?.dueCards?.length ?? 0}
                allCount={fetchDueDeckCache?.cards.length}
              />
            )}
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

            {deckType && cardContent.cards.length === 0 && (
              <EmptyDeckCard state={deckType} language={settings.learningLanguage} />
            )}

            {error && (
              <Core.Alert
                variant="outlined"
                severity="error"
                sx={{ bgcolor: '#f4433640', borderColor: '#f44336', mt: 1 }}
              >
                Oops, something went wrong. Please refresh the page and try again.
              </Core.Alert>
            )}
          </Core.Container>

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
