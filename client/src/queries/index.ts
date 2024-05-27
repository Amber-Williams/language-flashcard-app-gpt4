import { Lib } from '@mb3r/component-library';

export interface ICard {
  id: number;
  word: string;
  correct: string;
  options: string[];
  sentenceLANG: string;
  sentenceEN: string;
  state: 'New' | 'Learning' | 'Review' | 'Relearning';
}

const SmileyRatingMapper = {
  // incorrect
  0: 0,
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

const cards = {
  getReview: async (username: string, language: string) => {
    return await Lib.Fetch<{ cards: ICard[]; dueCards: ICard[] }>({
      url: `${import.meta.env.VITE_API_SERVER}/api/card/review?username=${username}&language=${language}`,
    });
  },
  getNew: async (username: string, language: string) => {
    return await Lib.Fetch<{ cards: ICard[] }>({
      url: `${import.meta.env.VITE_API_SERVER}/api/card?username=${username}&language=${language}`,
    });
  },
  postReviewRating: async (username: string, cardId: number, correct: boolean, rating: number) => {
    return await Lib.Fetch<{ detail: undefined; isDue: boolean } | { detail: 'User not found'; isDue: undefined }>({
      url: `${import.meta.env.VITE_API_SERVER}/api/card/${cardId}`,
      options: {
        method: 'POST',
        body: JSON.stringify({
          username: username,
          correct,
          rating: SmileyRatingMapper[rating as keyof typeof SmileyRatingMapper],
        }),
      },
    });
  },
  generateNew: async (subject: string, language: string, token?: string) => {
    return await Lib.Fetch<{ cards: ICard[] }>({
      url: `${import.meta.env.VITE_API_SERVER}/api/card/generate`,
      options: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': token ?? '',
        },
        body: JSON.stringify({ subject, language }),
      },
    });
  },
};

export { cards };
