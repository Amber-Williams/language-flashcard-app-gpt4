import { Background, Core, Icons, SmileyRating, Theme } from '@mb3r/component-library';
import { generate } from 'random-words';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import CreateMeDialog, { useCreateMeDialog } from './components/CreateMeDialog';
import SoundButton from './components/SoundButton';
import './main.css';

const DEFAULT_VOICE_SPEED = 80;

interface ICard {
  id: number;
  word: string;
  correct: string;
  options: string[];
  sentenceLANG: string;
  sentenceEN: string;
}

const SmileyRatingMapper = {
  // 1: '😢'
  1: 1,
  // 2: '😞
  2: 1,
  // 3: '😐,
  3: 2,
  // 4: '😊',
  4: 3,
  // 5: '😄',
  5: 4,
};

const App = () => {
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);
  const [answered, setAnswered] = React.useState<boolean>(false);
  const [wordsList, setWordsList] = React.useState<ICard[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<boolean>(false);
  const [subject, setSubject] = React.useState<string>('');
  const [token, setToken] = React.useState<string>('');
  const [username, setUsername] = React.useState<string | null>(null);
  const [themeMode, setThemeMode] = React.useState<'dark' | 'light' | null>(null);
  const [learningLanguage, setLearningLanguage] = React.useState<string | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const createMeDialog = useCreateMeDialog();

  const playBtn = document.getElementById('play-control-btn');
  const currentCard = wordsList[currentIndex];

  const setCachedFieldsOnLoad = () => {
    // Username
    if (localStorage.getItem('username')) {
      setUsername(localStorage.getItem('username'));
    } else {
      const _username = generate({ minLength: 3, maxLength: 5, exactly: 1, separator: '-', wordsPerString: 3 });
      setUsername(_username as string);
    }

    // Theme
    if (localStorage.getItem('theme') && ['dark', 'light'].includes(localStorage.getItem('theme') as string)) {
      setThemeMode(localStorage.getItem('theme') as 'dark' | 'light');
    } else {
      setThemeMode('dark');
    }

    // Learning language
    if (localStorage.getItem('language')) {
      setLearningLanguage(localStorage.getItem('language') as string);
    } else {
      setLearningLanguage('Italian');
    }
  };

  useEffect(() => {
    setCachedFieldsOnLoad();
  }, []);

  // store preferred theme in local storage
  useEffect(() => {
    if (!localStorage.getItem('theme') && themeMode) {
      localStorage.setItem('theme', themeMode);
    } else if (themeMode && themeMode !== localStorage.getItem('theme')) {
      localStorage.setItem('theme', themeMode);
    }
  }, [themeMode]);

  // store preferred learning language in local storage
  useEffect(() => {
    if (!localStorage.getItem('language') && learningLanguage) {
      localStorage.setItem('language', learningLanguage);
    } else if (learningLanguage && learningLanguage !== localStorage.getItem('language')) {
      localStorage.setItem('language', learningLanguage);
    }
  }, [learningLanguage]);

  // resets state on deck change
  useEffect(() => {
    resetState();
  }, [JSON.stringify(wordsList)]);

  const cacheUsernameOnRequest = () => {
    if (!localStorage.getItem('username') && username) {
      localStorage.setItem('username', username);
    }
  };

  const fetchNewWords = async () => {
    setLoading(true);
    setError(false);
    cacheUsernameOnRequest();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_SERVER}/api/card/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': token,
        },
        body: JSON.stringify({ subject, language: learningLanguage }),
      });
      if (response.status === 200) {
        const data = await response.json();
        setWordsList(data.cards);
      } else {
        throw new Error('Error fetching new words');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeenCards = async () => {
    setLoading(true);
    setError(false);
    cacheUsernameOnRequest();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER}/api/card/review?username=${username}&language=${learningLanguage}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.status === 200) {
        const data = await response.json();
        if (data.cards.length === 0) {
          alert('No cards to review right now - try some random ones!');
          return;
        }

        setWordsList(data.cards);
      } else {
        throw new Error('Error fetching seen cards');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomCards = async () => {
    setLoading(true);
    setError(false);
    cacheUsernameOnRequest();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_SERVER}/api/card?username=${username}&language=${learningLanguage}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      if (response.status === 200) {
        const data = await response.json();
        setWordsList(data.cards);
      } else {
        throw new Error('Error fetching random cards');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const postCardSeen = async (cardId: number, correct: boolean, rating: number) => {
    setError(false);
    cacheUsernameOnRequest();
    fetch(`${import.meta.env.VITE_API_SERVER}/api/card/${cardId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        correct,
        rating: SmileyRatingMapper[rating as keyof typeof SmileyRatingMapper],
      }),
    })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (data.detail && data.detail === 'User not found') {
          createMeDialog.toggle(true);
          return;
        }
        nextWord();
      })
      .catch(() => {
        setError(true);
      });
  };

  const nextWord = () => {
    setAnswered(false);
    if (playBtn && document) {
      playBtn.style.display = 'none';
    }

    setCurrentIndex(currentIndex + 1);
  };

  const resetState = () => {
    setAnswered(false);
    setCurrentIndex(0);
  };

  return (
    <Theme.Provider mode={themeMode === null ? 'dark' : (themeMode as 'dark' | 'light')}>
      <React.Fragment>
        <Core.CssBaseline />
        <div
          style={{
            height: '100vh',
            width: '100vw',
            position: 'absolute',
            backgroundColor: themeMode === null ? 'dark' : themeMode === 'dark' ? '#0f1011' : '#F8FAF6',
            zIndex: 0,
          }}
        >
          <Background.Surface>
            <Background.ContourMapSVG size={1000} />
          </Background.Surface>

          <Core.IconButton
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
            }}
            aria-label="settings"
            onClick={(event: React.MouseEvent<HTMLElement>) => {
              setAnchorEl(event.currentTarget);
            }}
          >
            <Icons.Settings />
          </Core.IconButton>

          <Core.Menu
            anchorEl={anchorEl}
            open={open}
            onClose={() => {
              setAnchorEl(null);
            }}
          >
            <Core.MenuItem>
              <Core.Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Icons.AccountCircle sx={{ mr: 1, my: 0.5 }} color="secondary" />
                <Core.TextField
                  value={username}
                  label="Username"
                  variant="standard"
                  color="secondary"
                  helperText="Used to save progress cross device."
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUsername(event.target.value)}
                  fullWidth
                  focused
                />
              </Core.Box>
            </Core.MenuItem>
            <Core.MenuItem>
              <Core.Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Icons.Tune sx={{ color: 'primary', mr: 1, my: 0.5 }} color="secondary" />
                <Core.TextField
                  value={token ?? '----------------------'}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setToken(event.target.value)}
                  label="OpenAI key"
                  variant="standard"
                  color="secondary"
                  helperText="This is optional."
                  fullWidth
                  focused
                  type="password"
                />
              </Core.Box>
            </Core.MenuItem>
            <Core.MenuItem>
              <Core.Box width="100%">
                <Core.Typography gutterBottom>Mode</Core.Typography>
                <Core.ToggleButtonGroup
                  value={themeMode}
                  exclusive
                  onChange={(_: Event, newMode?: 'dark' | 'light') => {
                    if (newMode) {
                      setThemeMode(newMode);
                    }
                  }}
                  aria-label="text alignment"
                  size="small"
                >
                  <Core.ToggleButton value="light" aria-label="left aligned" size="small">
                    Light
                  </Core.ToggleButton>
                  <Core.ToggleButton value="dark" aria-label="right aligned" size="small">
                    Dark
                  </Core.ToggleButton>
                </Core.ToggleButtonGroup>
              </Core.Box>
            </Core.MenuItem>
            <Core.MenuItem>
              <Core.TextField
                select
                label="Language"
                value={learningLanguage}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setLearningLanguage(event.target.value);
                  setWordsList([]);
                }}
                SelectProps={{
                  native: true,
                }}
                sx={{
                  mt: 1,
                  width: '100%',
                }}
                size="small"
              >
                <option value="Arabic">Arabic</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Hindi">Hindi</option>
                <option value="Italian">Italian</option>
                <option value="Japanese">Japanese</option>
                <option value="Mandarin">Mandarin</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Russian">Russian</option>
                <option value="Spanish">Spanish</option>
              </Core.TextField>
            </Core.MenuItem>
          </Core.Menu>

          <Core.Container maxWidth="sm">
            <Core.Card
              elevation={1}
              sx={{
                mt: 10,
                p: 2,
              }}
            >
              <Core.Grid container spacing={2}>
                <Core.Grid xs={9} item>
                  <Core.TextField
                    label={'Learn words about...'}
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)}
                    disabled={!token}
                    sx={{
                      opacity: token ? 1 : 0.5,
                    }}
                  />
                  {!token && (
                    <Core.Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', opacity: 0.5, mt: 1 }}>
                      <Icons.Info
                        fontSize="small"
                        sx={{
                          width: 15,
                          mr: 1,
                        }}
                      />
                      <Core.Typography variant="caption" component="p" align="left" small>
                        Add OpenAI key to enable this feature
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
                    disabled={loading || !token}
                  >
                    Learn
                    {loading && token && (
                      <Core.CircularProgress
                        size={15}
                        sx={{
                          ml: 2,
                        }}
                      />
                    )}
                  </Core.Button>
                </Core.Grid>
                <Core.Grid xs={6} item>
                  {/* spacing */}
                </Core.Grid>
                <Core.Grid xs={3} item>
                  <Core.Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={fetchRandomCards}
                    disabled={loading}
                  >
                    Random
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
                <Core.Grid xs={3} item>
                  <Core.Button variant="outlined" color="primary" fullWidth onClick={fetchSeenCards} disabled={loading}>
                    Review
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
          </Core.Container>

          {currentCard && (
            <Core.Container maxWidth="sm">
              <Core.Card
                elevation={1}
                sx={{
                  mt: 2,
                  p: 2,
                  position: 'relative',
                  pt: 4,
                }}
              >
                <Core.Stack
                  direction={learningLanguage === 'Arabic' ? 'row-reverse' : 'row'}
                  useFlexGap
                  flexWrap="wrap"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Core.Typography
                    variant="h5"
                    component="h5"
                    gutterBottom
                    sx={{
                      pl: learningLanguage === 'Arabic' ? 1 : 0,
                      pr: learningLanguage === 'Arabic' ? 0 : 1,
                    }}
                  >
                    {currentCard.word}{' '}
                    {learningLanguage && !answered && (
                      <SoundButton
                        text={currentCard.word}
                        language={learningLanguage}
                        speedPercent={DEFAULT_VOICE_SPEED / 100}
                      />
                    )}
                  </Core.Typography>
                </Core.Stack>

                <Core.Stack direction="row" spacing={2}>
                  {currentCard.options?.map((option, index) => (
                    <Core.Button
                      key={option + index}
                      sx={{
                        opacity: answered ? (option === currentCard.correct ? 1 : 0.5) : 1,
                      }}
                      variant={answered ? (option === currentCard.correct ? 'contained' : 'outlined') : 'outlined'}
                      color={answered ? (option === currentCard.correct ? 'success' : 'error') : 'primary'}
                      fullWidth
                      onClick={() => setAnswered(true)}
                      disableRipple={answered}
                      disableTouchRipple={answered}
                    >
                      {option}
                    </Core.Button>
                  ))}
                </Core.Stack>
                <br />
                {answered && (
                  <>
                    <Core.Stack
                      direction={learningLanguage === 'Arabic' ? 'row-reverse' : 'row'}
                      useFlexGap
                      flexWrap="wrap"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Core.Typography
                        variant="h5"
                        component="h5"
                        gutterBottom
                        sx={{
                          pl: learningLanguage === 'Arabic' ? 1 : 0,
                          pr: learningLanguage === 'Arabic' ? 0 : 1,
                          mt: 5,
                        }}
                      >
                        {currentCard.sentenceLANG}{' '}
                        <SoundButton
                          text={currentCard.sentenceLANG}
                          language={learningLanguage as string}
                          speedPercent={DEFAULT_VOICE_SPEED / 100}
                        />
                      </Core.Typography>
                    </Core.Stack>
                    <Core.Divider variant="middle" />
                    <Core.Typography
                      variant="h5"
                      component="h5"
                      gutterBottom
                      align="center"
                      sx={{
                        mb: 10,
                        mt: 2,
                      }}
                    >
                      {currentCard.sentenceEN}
                    </Core.Typography>

                    <Core.Box
                      sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Core.Typography gutterBottom>How was your memory for that?</Core.Typography>
                      <SmileyRating
                        onChange={(_: unknown, numSmiley: number) => postCardSeen(currentCard.id, true, numSmiley)}
                        style={{
                          transform: 'scale(1.5)',
                          paddingRight: '10px',
                        }}
                      />
                    </Core.Box>
                  </>
                )}
              </Core.Card>
            </Core.Container>
          )}
          {error && (
            <Core.Container maxWidth="sm" sx={{ mt: 3 }}>
              <Core.Alert variant="outlined" severity="error" sx={{ bgcolor: '#f4433640', borderColor: '#f44336' }}>
                Oops, something went wrong. Please refresh the page and try again.
              </Core.Alert>
            </Core.Container>
          )}

          <CreateMeDialog open={createMeDialog.open} toggle={createMeDialog.toggle} username={username ?? ''} />
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
