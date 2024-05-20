import { useEffect, useRef, useState } from 'react';

import { Theme } from '@mb3r/component-library';
import languageCodes from './../data/language-codes.json';

const utterance = new SpeechSynthesisUtterance();

const SoundButton = ({
  text,
  language,
  speedPercent,
  voice,
}: {
  text: string;
  language: string;
  speedPercent: number;
  voice: string;
}) => {
  const theme = Theme.useTheme();
  const [shouldPlayOnRender, setShouldPlayOnRender] = useState<boolean>(true);
  const barRef = useRef<SVGPathElement>(null);
  const playRef = useRef<SVGPathElement>(null);
  const pauseRef = useRef<SVGPathElement>(null);
  const isMultiWord = text.split(' ').length > 1;

  useEffect(() => {
    utterance.addEventListener('boundary', onTextBoundary);
    utterance.addEventListener('end', onTextEnd);
    utterance.addEventListener('voiceschanged', onBrowserVoicesLoad);

    return () => {
      window.speechSynthesis.cancel();
      utterance.removeEventListener('boundary', onTextBoundary);
      utterance.removeEventListener('end', onTextEnd);
      utterance.removeEventListener('voiceschanged', onBrowserVoicesLoad);
    };
  }, [text]);

  useEffect(() => {
    handleLanguageChange(language);
  }, [window.speechSynthesis?.getVoices(), language]);

  useEffect(() => {
    if (shouldPlayOnRender && utterance && window.speechSynthesis) {
      setShouldPlayOnRender(false);
      window.speechSynthesis.cancel();
      handlePlay();
    }
  });

  const onBrowserVoicesLoad = function () {
    handleLanguageChange(language);
  };

  const onTextBoundary = function (event: SpeechSynthesisEvent) {
    if (barRef.current) {
      playButtonStates.showPause();
      if (isMultiWord) {
        playButtonStates.loadTo(event.charIndex);
      }
    }
  };

  const onTextEnd = function () {
    if (barRef.current) {
      if (isMultiWord) {
        playButtonStates.loadTo(undefined);
      }

      setTimeout(() => {
        if (!window.speechSynthesis.speaking && barRef.current) {
          playButtonStates.showPlay();
        }
      }, 300);
    }
  };

  const handlePlay = () => {
    if (utterance && window.speechSynthesis && window.speechSynthesis.getVoices()) {
      utterance.text = text;
      playButtonStates.showPlay();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        window.speechSynthesis.speak(utterance as SpeechSynthesisUtterance);
      }
    }
  };

  const handleClick = () => {
    if (window.speechSynthesis?.speaking && !window.speechSynthesis?.paused) {
      window.speechSynthesis.pause();
    } else {
      handlePlay();
    }
  };

  const handleLanguageChange = (_language: string) => {
    if (utterance && window.speechSynthesis) {
      const languageCode = languageCodes.find((languageCode) => languageCode.name.includes(_language))?.code;
      const voices = window.speechSynthesis.getVoices();
      const voiceUtterance = voices.find((_voice) => _voice.name === voice);

      utterance.rate = speedPercent;

      if (voiceUtterance) {
        utterance.voice = voiceUtterance;
        return;
      }

      // Spanish voices are pretty bad with an exception of Google español and Paulina
      if (_language === 'Spanish') {
        utterance.voice = voices.filter((voice) => voice.name === 'Paulina')[0];
      } else if (_language === 'French') {
        utterance.voice = voices.filter((voice) => voice.name === 'Thomas')[0];
      } else if (_language === 'German') {
        utterance.voice = voices.filter((voice) => voice.name === 'Google Deutsch')[0];
        utterance.rate = 1;
      } else if (_language === 'Mandarin') {
        utterance.voice = voices.filter((voice) => voice.name === 'Tingting')[0];
      } else if (_language === 'Portuguese') {
        utterance.voice = voices.filter((voice) => voice.name === 'Joana')[0];
      } else if (_language === 'Japanese') {
        utterance.voice = voices.filter((voice) => voice.name === 'O-Ren')[0];
        utterance.rate = 1;
      } else {
        // Dev note: The speechSynthesis specification is pretty clear that a SpeechSynthesisVoice
        //           object's lang property should be a BCP 47 language code (e.g. "en-US", "ru-RU").
        //           Android returns voices with lang properties like "en_US" and "ru_RU".
        utterance.voice = voices.filter((voice) => voice.lang.replace('_', '-').split('-')[0] === languageCode)[0];
      }
    }
  };

  const playButtonStates = {
    showPlay: () => {
      if (barRef.current) {
        if (playRef.current?.getAttribute('display') === 'none') {
          playRef.current?.setAttribute('display', 'block');
          pauseRef.current?.setAttribute('display', 'none');
        }

        barRef.current.style.display = 'none';
        const totalLength = barRef.current.getTotalLength().toString();
        barRef.current.setAttribute('stroke-dasharray', totalLength);
        barRef.current.setAttribute('stroke-dashoffset', totalLength);
        barRef.current.style.display = 'block';
      }
    },
    showPause: () => {
      if (pauseRef.current?.getAttribute('display') === 'none') {
        playRef.current?.setAttribute('display', 'none');
        pauseRef.current?.setAttribute('display', 'block');
      }
    },
    loadTo: (charIndex?: number) => {
      if (barRef.current) {
        if (charIndex === undefined) {
          barRef.current.style.display = 'none';
          barRef.current.setAttribute('stroke-dashoffset', '0');
          return;
        }
        const totalLength = barRef.current.getTotalLength();
        const totalTextLength = text.split('').length;
        const calc = totalLength - (charIndex / totalTextLength) * totalLength;
        barRef.current.setAttribute('stroke-dashoffset', calc.toString());
      }
    },
  };

  return (
    <svg
      width="20"
      height="20"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      onClick={handleClick}
    >
      <path
        id="border"
        fill="none"
        stroke={theme.palette.primary.main}
        strokeWidth="1.5"
        strokeMiterlimit="10"
        d="M50,2.9L50,2.9C76,2.9,97.1,24,97.1,50v0C97.1,76,76,97.1,50,97.1h0C24,97.1,2.9,76,2.9,50v0C2.9,24,24,2.9,50,2.9z"
      />
      <path
        id="bar"
        fill="none"
        stroke={theme.palette.primary.main}
        strokeWidth="4.5"
        strokeMiterlimit="10"
        d="M50,2.9L50,2.9C76,2.9,97.1,24,97.1,50v0C97.1,76,76,97.1,50,97.1h0C24,97.1,2.9,76,2.9,50v0C2.9,24,24,2.9,50,2.9z"
        style={{ transition: 'all .3s' }}
        ref={barRef}
      />

      <g id="pause" ref={pauseRef} display="none">
        <g>
          <path
            fill={theme.palette.primary.main}
            d="M46.1,65.7h-7.3c-0.4,0-0.7-0.3-0.7-0.7V35c0-0.4,0.3-0.7,0.7-0.7h7.3c0.4,0,0.7,0.3,0.7,0.7V65 C46.8,65.4,46.5,65.7,46.1,65.7z"
          />
          <path
            fill={theme.palette.primary.main}
            d="M61.2,65.7h-7.3c-0.4,0-0.7-0.3-0.7-0.7V35c0-0.4,0.3-0.7,0.7-0.7h7.3c0.4,0,0.7,0.3,0.7,0.7V65 C61.9,65.4,61.6,65.7,61.2,65.7z"
          />
        </g>
      </g>

      <g id="play" ref={playRef} display="none">
        <path
          fill={theme.palette.primary.main}
          d="M41.1,33.6l24.5,15.6c0.6,0.4,0.6,1.1,0,1.5L41.1,66.4c-0.7,0.5-1.8,0-1.8-0.7V34.4 C39.3,33.6,40.4,33.2,41.1,33.6z"
        />
      </g>
    </svg>
  );
};

export default SoundButton;
