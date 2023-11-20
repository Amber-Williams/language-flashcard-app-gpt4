import { Background, Card, Core, Icons, Theme } from '@mb3r/component-library';
import React from 'react';
import ReactDOM from 'react-dom/client';

import SoundButton from './components/SoundButton';
import './main.css';

interface ICard {
  word: string;
  correct: string;
  incorrect_options: string[];
  sentenceLANG: string;
  sentenceEN: string;
}

const App = () => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answered, setAnswered] = React.useState(false);
  const [wordsList, setWordsList] = React.useState<ICard[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const mode = 'dark';
  const playBtn = document.getElementById('play-control-btn');
  const currentCard = wordsList[currentIndex];
  const options = currentCard ? [currentCard.correct, ...currentCard.incorrect_options] : undefined;

  async function fetchNewWords() {
    // Show loading component
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/new_words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });
      const data = await response.json();
      setCurrentIndex(0);
      setWordsList(data);
      nextWord();
    } catch (error) {
      console.error('Error during fetch operation: ', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSeenCards() {
    // Show loading component
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/seen_words', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setCurrentIndex(0);
      setWordsList(data);
      nextWord();
    } catch (error) {
      console.error('Error during fetch operation: ', error);
    } finally {
      setLoading(false);
    }
  }

  function nextWord() {
    setAnswered(false);
    if (playBtn && document) {
      playBtn.style.display = 'none';
    }

    setCurrentIndex(currentIndex + 1);
  }

  function checkAnswer() {
    setAnswered(true);
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        position: 'absolute',
        backgroundColor: mode === 'dark' ? '#181212' : '#F8FAF6',
        zIndex: 0,
        marginTop: -8,
        marginLeft: -8,
      }}
    >
      <Theme.Provider mode={mode}>
        <Background.Surface>
          <Background.ContourMapSVG size={1000} />
        </Background.Surface>

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
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)}
                />
              </Core.Grid>
              <Core.Grid xs={3} item>
                <Core.Button variant="outlined" color="primary" fullWidth onClick={fetchNewWords} disabled={loading}>
                  Learn{' '}
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
              <Core.Grid xs={9} item>
                <></>
              </Core.Grid>
              <Core.Grid xs={3} item>
                <Core.Button variant="contained" color="primary" fullWidth onClick={fetchSeenCards} disabled={loading}>
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
                {currentCard.word} <SoundButton text={currentCard.word} />
              </Core.Typography>
              <Core.Stack direction="row" spacing={2}>
                {options?.map((option) => (
                  <Core.Button
                    key={option}
                    variant="outlined"
                    color={answered ? (option === currentCard.correct ? 'success' : 'error') : 'primary'}
                    fullWidth
                    onClick={() => checkAnswer()}
                  >
                    {option}
                  </Core.Button>
                ))}
              </Core.Stack>
              {answered && (
                <>
                  <Core.Typography
                    variant="h5"
                    component="h5"
                    gutterBottom
                    align="center"
                    sx={{
                      mt: 2,
                    }}
                  >
                    {currentCard.sentenceLANG} <SoundButton text={currentCard.sentenceLANG} />
                  </Core.Typography>
                  <Core.Typography
                    variant="h5"
                    component="h5"
                    gutterBottom
                    align="center"
                    sx={{
                      mb: 10,
                    }}
                  >
                    {currentCard.sentenceEN}
                  </Core.Typography>

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
                </>
              )}
            </Card>
          </Core.Container>
        )}
      </Theme.Provider>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
