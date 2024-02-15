import { useEffect, useRef, useState } from 'react';

import { Theme } from '@mb3r/component-library';
import languageCodes from './../data/language-codes.json';

const SoundButton = ({ text, language, speedPercent }: { text: string; language: string; speedPercent: number }) => {
  const theme = Theme.useTheme();
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance>();
  const [synth, setSynth] = useState<SpeechSynthesis>();
  const btnRef = useRef<SVGSVGElement>(null);
  const barRef = useRef<SVGPathElement>(null);
  const playRef = useRef<SVGPathElement>(null);
  const pauseRef = useRef<SVGPathElement>(null);
  const isMultiWord = text.split(' ').length > 1;

  useEffect(() => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterThis = new SpeechSynthesisUtterance(text);

    utterThis.onboundary = (event) => {
      if (barRef.current) {
        if (pauseRef.current?.getAttribute('display') === 'none') {
          playRef.current?.setAttribute('display', 'none');
          pauseRef.current?.setAttribute('display', 'block');
        }

        if (isMultiWord) {
          const totalLength = barRef.current.getTotalLength();
          const totalTextLength = text.split('').length;
          const calc = totalLength - (event.charIndex / totalTextLength) * totalLength;
          barRef.current.setAttribute('stroke-dashoffset', calc.toString());
        }
      }
    };

    utterThis.onend = function () {
      if (barRef.current) {
        if (isMultiWord) {
          barRef.current.setAttribute('stroke-dashoffset', '0');
        }

        setTimeout(() => {
          if (!synth.speaking && barRef.current) {
            if (playRef.current?.getAttribute('display') === 'none') {
              playRef.current?.setAttribute('display', 'block');
              pauseRef.current?.setAttribute('display', 'none');
            }
            loading.reset();
          }
        }, 300);
      }
    };

    setSynth(synth);
    setUtterance(utterThis);

    return () => {
      synth.cancel();
    };
  }, [text]);

  useEffect(() => {
    if (utterance && synth) {
      const languageCode = languageCodes.find((languageCode) => languageCode.name.includes(language))?.code;
      const defaultVoice = synth.getVoices().filter((voice) => voice.lang.split('-')[0] === languageCode)[0];
      utterance.lang = defaultVoice?.lang;
      utterance.rate = speedPercent;

      loading.reset();
      handlePlay();
    }
  }, [utterance, synth, language, speedPercent]);

  const handlePlay = () => {
    if ((synth as SpeechSynthesis).paused) {
      (synth as SpeechSynthesis).resume();
    } else {
      (synth as SpeechSynthesis).speak(utterance as SpeechSynthesisUtterance);
    }
  };

  const handlePause = () => {
    if ((synth as SpeechSynthesis).speaking) {
      (synth as SpeechSynthesis).pause();
    }
  };

  const handleClick = () => {
    if ((synth as SpeechSynthesis).speaking) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const loading = {
    reset: () => {
      if (barRef.current) {
        barRef.current.style.display = 'none';
        const totalLength = barRef.current.getTotalLength().toString();
        barRef.current.setAttribute('stroke-dasharray', totalLength);
        barRef.current.setAttribute('stroke-dashoffset', totalLength);
        barRef.current.style.display = 'block';
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
      ref={btnRef}
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
