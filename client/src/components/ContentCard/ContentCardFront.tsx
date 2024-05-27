import { Core, Theme } from '@mb3r/component-library';

import SoundButton from './../SoundButton';
import { CardStateChip, ContentCardType } from './index';

interface IContentCardFront extends ContentCardType {
  learningLanguage: string;
  voiceSpeed: number;
  voice: string;
}

const ContentCardFront = (props: IContentCardFront) => {
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
          {props.learningLanguage && (
            <SoundButton
              text={props.card.word}
              language={props.learningLanguage}
              speedPercent={props.voiceSpeed / 100}
              voice={props.voice}
            />
          )}
        </Core.Typography>
      </Core.Stack>

      <Core.Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
        {props.card.options?.map((option, index) => (
          <Core.Button
            key={option + index}
            variant="outlined"
            color="primary"
            fullWidth
            onClick={() => props.setAnswered(index)}
          >
            {option}
          </Core.Button>
        ))}
      </Core.Stack>
    </Core.Card>
  );
};

export default ContentCardFront;
