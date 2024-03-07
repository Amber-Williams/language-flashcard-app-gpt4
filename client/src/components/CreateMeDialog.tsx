import { Core } from '@mb3r/component-library';

import * as React from 'react';

export const useCreateMeDialog = () => {
  const [open, setOpen] = React.useState(false);
  const toggle = (setting: boolean) => setOpen(setting);

  return { open, toggle };
};

interface IFormDialogProps extends ReturnType<typeof useCreateMeDialog> {
  username: string;
}

export default function CreateMeDialog({ open, toggle, username }: IFormDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_SERVER}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      toggle(false);
      setShowSuccess(true);
    } catch (error) {
      alert('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <React.Fragment>
      <Core.Dialog
        open={open}
        onClose={() => toggle(false)}
        PaperProps={{
          component: 'form',
          onSubmit,
        }}
      >
        <Core.DialogTitle>Before you get going...</Core.DialogTitle>
        <Core.DialogContent>
          <Core.DialogContentText
            sx={{
              mb: 3,
            }}
          >
            Looks like your generated username doesn't exist yet. Do you wish to create a new one? This username can be
            used to review cards across all your devices.
          </Core.DialogContentText>
          <Core.TextField
            value={username}
            label="Username"
            variant="filled"
            color="secondary"
            fullWidth
            focused
            disabled={true}
            helperText="You can edit this in settings."
          />
        </Core.DialogContent>
        <Core.DialogActions>
          <Core.Button onClick={() => toggle(false)}>Cancel</Core.Button>
          <Core.Button type="submit" disabled={loading}>
            Create
          </Core.Button>
        </Core.DialogActions>
      </Core.Dialog>
      <Core.Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Core.Alert onClose={() => setShowSuccess(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          Username saved successfully!
        </Core.Alert>
      </Core.Snackbar>
    </React.Fragment>
  );
}
