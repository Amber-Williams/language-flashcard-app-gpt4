import { Core } from '@mb3r/component-library';

import { SettingsMenuType } from './SettingsMenu';

interface LanguageDropdownInputProps extends Pick<SettingsMenuType, 'setLearningLanguage' | 'learningLanguage'> {
  hiddenLabel?: true;
}

const LanguageDropdownInput = (props: LanguageDropdownInputProps) => (
  <Core.TextField
    select
    label={props.hiddenLabel ? undefined : 'Language'}
    value={props.learningLanguage}
    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
      props.setLearningLanguage(event.target.value);
    }}
    SelectProps={{
      native: true,
    }}
    sx={{
      width: '100%',
    }}
    size="small"
    hiddenLabel={props.hiddenLabel}
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
);

export default LanguageDropdownInput;
