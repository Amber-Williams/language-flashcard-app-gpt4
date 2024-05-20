import { Core, Icons } from '@mb3r/component-library';
import { generate } from 'random-words';
import { useEffect, useState } from 'react';

import languageCodes from './../data/language-codes.json';

type SettingsMenuType = ReturnType<typeof useSettingsMenu>;

export const useSettingsMenu = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | undefined>();
  const [username, setUsername] = useState<string>('');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('light');
  const [learningLanguage, setLearningLanguage] = useState<string>('Spanish');
  const [voice, setVoice] = useState<string>('Paulina');

  useEffect(() => {
    setCachedFieldsOnLoad();
  }, []);

  const onChangeUsername = (value: string) => {
    if (value) {
      localStorage.setItem('username', value);
    }
    setUsername(value);
  };

  const onChangeTheme = (value: 'dark' | 'light') => {
    if (value) {
      localStorage.setItem('theme', value);
    }
    setThemeMode(value);
  };

  const onChangeLanguage = (value: string) => {
    if (value) {
      localStorage.setItem('language', value);
    }
    setLearningLanguage(value);
    onChangeVoice('', value);
  };

  const onChangeVoice = (value: string, _language?: string) => {
    if (_language) {
      // default voice based on language
      const voices = window.speechSynthesis.getVoices();
      let _voice = voice;

      if (_language === 'Spanish') {
        _voice = voices.filter((voice) => voice.name === 'Paulina')[0].name;
      } else if (_language === 'French') {
        _voice = voices.filter((voice) => voice.name === 'Thomas')[0].name;
      } else if (_language === 'German') {
        _voice = voices.filter((voice) => voice.name === 'Google Deutsch')[0].name;
      } else if (_language === 'Mandarin') {
        _voice = voices.filter((voice) => voice.name === 'Tingting')[0].name;
      } else if (_language === 'Portuguese') {
        _voice = voices.filter((voice) => voice.name === 'Joana')[0].name;
      } else if (_language === 'Japanese') {
        _voice = voices.filter((voice) => voice.name === 'O-Ren')[0].name;
      }
      setVoice(_voice);
    } else {
      // user set voice from dropdown
      setVoice(value);
      localStorage.setItem(learningLanguage + '-voice', value);
    }
  };

  const setCachedFieldsOnLoad = () => {
    // Username
    if (localStorage.getItem('username')) {
      setUsername(localStorage.getItem('username') as string);
    } else {
      const _username = generate({ minLength: 3, maxLength: 5, exactly: 1, separator: '-', wordsPerString: 3 });
      onChangeUsername(_username as string);
    }

    // Theme
    if (localStorage.getItem('theme') && ['dark', 'light'].includes(localStorage.getItem('theme') as string)) {
      setThemeMode(localStorage.getItem('theme') as 'dark' | 'light');
    } else {
      // Get the user's theme preference from the OS
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        onChangeTheme('dark');
      } else {
        onChangeTheme('light');
      }
    }

    // Learning language
    let _language = localStorage.getItem('language');
    if (_language) {
      setLearningLanguage(localStorage.getItem('language') as string);
    } else {
      setLearningLanguage('Italian');
      localStorage.setItem('language', 'Italian');
      _language = 'Italian';
    }

    // Preferred voice
    const _savedVoice = localStorage.getItem(_language + '-voice');
    if (_savedVoice) {
      setVoice(_savedVoice);
    }
  };

  return {
    anchorEl,
    setAnchorEl,
    username,
    setUsername: onChangeUsername,
    token,
    setToken,
    themeMode,
    setThemeMode: onChangeTheme,
    learningLanguage,
    setLearningLanguage: onChangeLanguage,
    voice,
    setVoice: onChangeVoice,
  };
};

const SettingsMenu = (props: SettingsMenuType) => {
  const open = Boolean(props.anchorEl);
  const languageCode = languageCodes.find((languageCode) => languageCode.name.includes(props.learningLanguage))?.code;

  return (
    <Core.Menu
      anchorEl={props.anchorEl}
      open={open}
      onClose={() => {
        props.setAnchorEl(undefined);
      }}
    >
      <Core.MenuItem>
        <Core.Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Icons.AccountCircle sx={{ mr: 1, my: 0.5 }} color="secondary" />
          <Core.TextField
            value={props.username}
            label="Username"
            variant="standard"
            color="secondary"
            helperText="Used to save progress cross device."
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => props.setUsername(event.target.value)}
            fullWidth
            focused
          />
        </Core.Box>
      </Core.MenuItem>
      <Core.MenuItem>
        <Core.Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Icons.Tune sx={{ color: 'primary', mr: 1, my: 0.5 }} color="secondary" />
          <Core.TextField
            value={props.token ?? '----------------------'}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => props.setToken(event.target.value)}
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
            value={props.themeMode}
            exclusive
            onChange={(_: Event, newMode?: 'dark' | 'light') => {
              if (newMode) {
                props.setThemeMode(newMode);
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
          value={props.learningLanguage}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            props.setLearningLanguage(event.target.value);
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
      <Core.MenuItem>
        <Core.TextField
          select
          label={props.learningLanguage + ' voice'}
          value={props.voice}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            props.setVoice(event.target.value);
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
          {window.speechSynthesis
            .getVoices()
            .filter((voice) => voice.lang.replace('_', '-').split('-')[0] === languageCode)
            .map((voice: SpeechSynthesisVoice, _, voices: SpeechSynthesisVoice[]) => {
              const extractCountry = (str: string) => {
                const match = str.match(/\(([^()]+)\s*\(([^()]+)\)\)/);
                return match ? match[2] : null;
              };

              const utilStripParenthesesContent = (str: string) => {
                const formattedStr = str.replace(/\(.*?\)/g, '').replace(/\)/g, '');
                if (voices.findLastIndex((voice) => voice.name.includes(formattedStr))) {
                  if (extractCountry(str)) {
                    return formattedStr + ' - ' + extractCountry(str);
                  }
                }
                return formattedStr;
              };

              return (
                <option key={voice.name} value={voice.name}>
                  {utilStripParenthesesContent(voice.name)}
                </option>
              );
            })}
        </Core.TextField>
      </Core.MenuItem>
    </Core.Menu>
  );
};

export default SettingsMenu;
