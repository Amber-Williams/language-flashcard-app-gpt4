import { Chip, Core } from '@mb3r/component-library';
import { useState } from 'react';

import * as queries from '../../queries';
import ContentCardBack from './ContentCardBack';
import ContentCardFront from './ContentCardFront';

export { ContentCardBack, ContentCardFront };

export type ContentCardType = ReturnType<typeof useContentCard>;

export const useContentCard = () => {
  const [answered, setAnswered] = useState<'correct' | 'incorrect' | 'pending'>('pending');
  const [card, setCard] = useState<queries.ICard | undefined>();
  const [cards, setCards] = useState<queries.ICard[]>([]);

  const onSetAnswered = (index: number) => {
    if (!card) return;

    if (card.correct === card.options[index]) {
      setAnswered('correct');
    } else {
      setAnswered('incorrect');
    }
  };

  const onSetCard = (_card: queries.ICard) => {
    setCard(_card);
    setAnswered('pending');
  };

  const onSetCards = (_cards: queries.ICard[]) => {
    setCard(_cards[0]);
    setCards(_cards);
    setAnswered('pending');
  };

  const nextCard = () => {
    const currentIndex = cards.findIndex((c) => c.id === card?.id);
    const nextCard = cards[currentIndex + 1];
    if (!nextCard) {
      // deck stack completed reset state
      onSetCards([]);
    } else {
      onSetCard(nextCard);
    }
  };

  const resetDeck = () => {
    setCards([]);
    setCard(undefined);
    setAnswered('pending');
  };

  return {
    answered,
    setAnswered: onSetAnswered,
    card,
    setCard: onSetCard,
    setCards: onSetCards,
    cards,
    nextCard,
    resetDeck,
  };
};

export const CardStateChip = ({ state }: { state: 'New' | 'Learning' | 'Review' | 'Relearning' }) => {
  let color = 'error'; // Relearning
  if (state === 'New') {
    color = 'success';
  } else if (state === 'Learning') {
    color = 'warning';
  } else if (state === 'Review') {
    color = 'info';
  }

  return (
    <Chip
      color={color}
      variant="outlined-low-fill"
      label={state.toUpperCase()}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        mt: 1,
        ml: 1,
      }}
      size="small"
    />
  );
};

export const EmptyDeckCard = ({ state }: { state: 'New' | 'Review' }) => {
  return (
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
        <CardStateChip state={state} />
        <Core.Typography
          variant="h5"
          component="h5"
          gutterBottom
          sx={{
            pl: 0,
            pr: 1,
            mt: 3,
            textAlign: 'center',
          }}
        >
          No more cards are in this deck.
        </Core.Typography>
        {state === 'New' ? (
          <Core.Typography variant="body2" component="p" gutterBottom sx={{ mb: 3, mx: 3 }}>
            You have reached the end of the words for this language. <br />
            <br />
            To keep learning this language generate more cards with an OpenAI key to continue learning. Other users will
            also be able to review cards you generate! <br />
            <br />
            You can also switch to another language.
          </Core.Typography>
        ) : (
          <Core.Typography variant="body2" component="p" gutterBottom sx={{ textAlign: 'center', mb: 3, mx: 3 }}>
            You have reviewed all the cards due for review today. Check back tomorrow or learn/generate new cards.
          </Core.Typography>
        )}
      </Core.Card>
    </Core.Container>
  );
};
