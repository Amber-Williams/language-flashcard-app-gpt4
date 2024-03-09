import { Background, Card, Core, Icons, Theme } from '@mb3r/component-library';
import { generate } from 'random-words';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import CreateMeDialog, { useCreateMeDialog } from './components/CreateMeDialog';
import SoundButton from './components/SoundButton';
import './main.css';

interface ICard {
  id: number;
  word: string;
  correct: string;
  options: string[];
  sentenceLANG: string;
  sentenceEN: string;
  times_seen?: number;
}

const App = () => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answered, setAnswered] = React.useState(false);
  const [wordsList, setWordsList] = React.useState<ICard[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [subject, setSubject] = React.useState('');
  const [token, setToken] = React.useState<string>('');
  const [username, setUsername] = React.useState<string | null>(null);
  const [themeMode, setThemeMode] = React.useState('dark');
  const [learningLanguage] = React.useState('Italian');
  const [voiceSpeed, setVoiceSpeed] = React.useState(80);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const createMeDialog = useCreateMeDialog();

  const playBtn = document.getElementById('play-control-btn');
  const currentCard = wordsList[currentIndex];

  const setUsernameOnLoad = () => {
    if (localStorage.getItem('username')) {
      setUsername(localStorage.getItem('username'));
    } else {
      const _username = generate({ minLength: 3, maxLength: 5, exactly: 1, separator: '-', wordsPerString: 3 });
      setUsername(_username as string);
    }
  };

  useEffect(() => {
    setUsernameOnLoad();
  }, []);

  // resets state on deck change
  useEffect(() => {
    resetState();
  }, [JSON.stringify(wordsList)]);

  const cacheUsernameOnRequest = () => {
    if (!localStorage.getItem('username') && username) {
      localStorage.setItem('username', username);
    }
  };

  async function fetchNewWords() {
    setLoading(true);
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
      const data = await response.json();
      setWordsList(data.cards);
    } catch (error) {
      console.error('Error during fetch operation: ', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSeenCards() {
    setLoading(true);
    cacheUsernameOnRequest();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_SERVER}/api/card/review?username=${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (data.length === 0) {
        alert('No cards to review - try some random ones first!');
        return;
      }

      setWordsList(data.cards);
    } catch (error) {
      console.error('Error during fetch operation: ', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRandomCards() {
    setLoading(true);
    cacheUsernameOnRequest();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_SERVER}/api/card`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setWordsList(data.cards);
    } catch (error) {
      console.error('Error during fetch operation: ', error);
    } finally {
      setLoading(false);
    }
  }

  async function postCardSeen(cardId: number, correct: boolean) {
    cacheUsernameOnRequest();
    fetch(`${import.meta.env.VITE_API_SERVER}/api/card/${cardId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, correct }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.detail && data.detail === 'User not found') {
          createMeDialog.toggle(true);
        } else {
          setAnswered(true);
        }
      });
  }

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
    <React.Fragment>
      <Core.CssBaseline />
      <div
        style={{
          height: '100vh',
          width: '100vw',
          position: 'absolute',
          backgroundColor: themeMode === 'dark' ? '#181212' : '#F8FAF6',
          zIndex: 0,
        }}
      >
        <Theme.Provider mode={themeMode as 'dark' | 'light'}>
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

            {/* 
            // TODO: temporarily removed due to keyevent listener in component preventing copy/pasting in form fields
            <Core.MenuItem>
              <Core.Box width="100%">
                <Core.Typography gutterBottom>Voice speed</Core.Typography>
                <Core.Slider
                  value={voiceSpeed}
                  onChange={(_: Event, newValue: number) => {
                    setVoiceSpeed(newValue);
                  }}
                  min={10}
                  max={100}
                  aria-labelledby="continuous-slider"
                />
              </Core.Box>
            </Core.MenuItem> */}
            {/* <Core.MenuItem>
              <Core.TextField
                select
                label="Language"
                value={learningLanguage}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setLearningLanguage(event.target.value)}
                SelectProps={{
                  native: true,
                }}
                sx={{
                  width: '100%',
                }}
                size="small"
              >
                <option value="Italian">Italian</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </Core.TextField>
            </Core.MenuItem> */}
          </Core.Menu>

          <Core.Container maxWidth="sm">
            <Card
              sx={{
                mt: 10,
                p: 2,
              }}
            >
              <Core.Grid container spacing={2}>
                <Core.Grid xs={9} item>
                  <Core.TextField
                    label="Learn words about..."
                    variant="outlined"
                    fullWidth
                    size="small"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)}
                    disabled={!token}
                    sx={{
                      opacity: token ? 1 : 0.5,
                    }}
                  />
                </Core.Grid>
                <Core.Grid xs={3} item>
                  <Core.Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    onClick={fetchNewWords}
                    disabled={loading || !token}
                  >
                    Learn{' '}
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
                    Random{' '}
                    {loading && (
                      <Core.CircularProgress
                        size={15}
                        sx={{
                          ml: 2,
                        }}
                      />
                    )}
                  </Core.Button>
                </Core.Grid>
                <Core.Grid xs={3} item>
                  <Core.Button variant="outlined" color="primary" fullWidth onClick={fetchSeenCards} disabled={loading}>
                    Review{' '}
                    {loading && (
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
            </Card>
          </Core.Container>

          {currentCard && (
            <Core.Container maxWidth="sm">
              <Card
                sx={{
                  mt: 2,
                  p: 2,
                  position: 'relative',
                  pt: 4,
                }}
              >
                <Core.Typography variant="h4" component="h1" gutterBottom align="center">
                  {currentCard.word}{' '}
                  <SoundButton text={currentCard.word} language={learningLanguage} speedPercent={voiceSpeed / 100} />
                </Core.Typography>
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
                      onClick={() => postCardSeen(currentCard.id, option === currentCard.correct)}
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
                    <Core.Typography
                      variant="h5"
                      component="h5"
                      gutterBottom
                      align="center"
                      sx={{
                        my: 2,
                      }}
                    >
                      {currentCard.sentenceLANG}{' '}
                      <SoundButton
                        text={currentCard.sentenceLANG}
                        language={learningLanguage}
                        speedPercent={voiceSpeed / 100}
                      />
                    </Core.Typography>
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

                    {currentCard?.times_seen && currentCard.times_seen >= 3 ? (
                      <Core.Box sx={{ p: 2, display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Core.Typography gutterBottom>
                          You&apos;ve seen this one a few times now how&apos;s it going?
                        </Core.Typography>
                        <Core.ButtonGroup
                          variant="outlined"
                          color="secondary"
                          aria-label="outlined secondary button group"
                        >
                          <Core.Button onClick={nextWord}>Hard</Core.Button>
                          <Core.Button onClick={nextWord}>Good</Core.Button>
                          <Core.Button onClick={nextWord}>Easy</Core.Button>
                        </Core.ButtonGroup>
                      </Core.Box>
                    ) : (
                      <Core.Button
                        aria-label="next card"
                        color="secondary"
                        variant="outlined"
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          m: 2,
                          py: 1,
                          borderRadius: 50,
                        }}
                        onClick={nextWord}
                      >
                        <span>Next</span>
                        <Icons.NavigateNext />
                      </Core.Button>
                    )}
                  </>
                )}
              </Card>
            </Core.Container>
          )}
          <CreateMeDialog open={createMeDialog.open} toggle={createMeDialog.toggle} username={username ?? ''} />
        </Theme.Provider>
      </div>
    </React.Fragment>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
