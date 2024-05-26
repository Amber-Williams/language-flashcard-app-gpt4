import { Core, Icons, SmileyRating, Theme } from '@mb3r/component-library';

import SoundButton from './../SoundButton';
import { CardStateChip, ContentCardType } from './index';

interface IContentCardBack extends ContentCardType {
  learningLanguage: string;
  voiceSpeed: number;
  voice: string;
  onRateCard: (cardId: number, correct: boolean, rating: number) => Promise<void>;
}

const ContentCardBack = (props: IContentCardBack) => {
  const theme = Theme.useTheme();
  const isMobile = Core.useMediaQuery(theme.breakpoints.down('sm'));

  if (!props.card) return null;

  return (
    <Core.Card
      elevation={1}
      sx={{
        mt: 2,
        p: 2,
        position: 'relative',
        pt: 4,
      }}
    >
      <CardStateChip state={props.card.state} />
      <Core.Stack
        direction={props.learningLanguage === 'Arabic' ? 'row-reverse' : 'row'}
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
            pl: props.learningLanguage === 'Arabic' ? 1 : 0,
            pr: props.learningLanguage === 'Arabic' ? 0 : 1,
            mt: 3,
          }}
        >
          {props.card.word}{' '}
        </Core.Typography>
      </Core.Stack>
      <Core.Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
        {props.card.options?.map((option, index) => (
          <Core.Button
            key={option + index}
            sx={{
              opacity: props.card && option === props.card.correct ? 1 : 0.5,
            }}
            variant={props.card && option === props.card.correct ? 'contained' : 'outlined'}
            color={props.card && option === props.card.correct ? 'success' : 'error'}
            fullWidth
          >
            {option}
          </Core.Button>
        ))}
      </Core.Stack>
      <br />
      <>
        <Core.Stack
          direction={props.learningLanguage === 'Arabic' ? 'row-reverse' : 'row'}
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
              pl: props.learningLanguage === 'Arabic' ? 1 : 0,
              pr: props.learningLanguage === 'Arabic' ? 0 : 1,
              mt: 5,
            }}
          >
            {props.card.sentenceLANG}{' '}
            <SoundButton
              text={props.card.sentenceLANG}
              language={props.learningLanguage as string}
              speedPercent={props.voiceSpeed / 100}
              voice={props.voice}
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
          {props.card.sentenceEN}
        </Core.Typography>

        <Core.Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: isMobile && props.answered === 'correct' ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {props.answered === 'incorrect' ? (
            <>
              <Core.Zoom in={true} timeout={600} style={{ transformOrigin: '0 0 0' }}>
                <Core.Typography
                  gutterBottom
                  sx={{
                    opacity: 0.5,
                    mb: 0,
                  }}
                >
                  You got that wrong.
                </Core.Typography>
              </Core.Zoom>
              <Core.Fade in={true} timeout={2500}>
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
                  onClick={() => {
                    if (props.card) {
                      props.onRateCard(props.card.id, false, 0);
                    }
                  }}
                >
                  <span>Next</span>
                  <Icons.NavigateNext />
                </Core.Button>
              </Core.Fade>
            </>
          ) : (
            <>
              <Core.Typography gutterBottom>How was your memory for that?</Core.Typography>
              <SmileyRating
                onChange={(_: unknown, numSmiley: number) => {
                  if (props.card) {
                    props.onRateCard(props.card.id, props.answered === 'correct', numSmiley);
                  }
                }}
                style={{
                  transform: 'scale(1.5)',
                  paddingRight: '10px',
                }}
              />
            </>
          )}
        </Core.Box>
      </>
    </Core.Card>
  );
};

export default ContentCardBack;
