import { Chip, Core } from '@mb3r/component-library';
import { Dispatch, SetStateAction } from 'react';

interface IStudyToggle {
  studyToggleTab: 'Due' | 'All';
  setStudyToggleTab: Dispatch<SetStateAction<'Due' | 'All'>>;
  dueCount: number;
  allCount: number | undefined;
}

const StudyToggle = ({ studyToggleTab, setStudyToggleTab, dueCount, allCount }: IStudyToggle) => {
  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) {
      setStudyToggleTab('Due');
    } else {
      setStudyToggleTab('All');
    }
  };

  return (
    <Core.Tabs
      value={['Due', 'All'].indexOf(studyToggleTab)}
      onChange={handleChange}
      aria-label="Bottom Navigation"
      indicatorColor="secondary"
      textColor="secondary"
      TabIndicatorProps={{
        style: {
          display: 'none',
        },
      }}
      centered
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sx={(theme: any) => ({
        p: 1,
        mt: 4,
        maxWidth: 400,
        mx: 'auto',
        borderRadius: '16px',
        boxShadow: theme.shadows[1],
        bgcolor: theme.palette.grey[50],
        '& .MuiTab-root': {
          py: 1,
          flex: 1,
          transition: '0.3s',
          fontWeight: theme.typography.fontWeightMedium,
          fontSize: theme.typography.pxToRem(16),
          '&:not(.Mui-selected):not(:hover)': {
            opacity: 0.7,
          },
        },
      })}
    >
      <Core.Tab
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sx={(theme: any) => ({
          '&.Mui-selected': {
            backgroundColor: theme.palette.background.paper,
            borderRadius: '16px',
          },
        })}
        label={
          <Core.Box sx={{ display: 'flex', alignItems: 'center' }}>
            Due {dueCount ? <Chip label={dueCount} size="small" variant="filled" color="error" sx={{ ml: 1 }} /> : null}
          </Core.Box>
        }
      />
      <Core.Tab
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sx={(theme: any) => ({
          '&.Mui-selected': {
            backgroundColor: theme.palette.background.paper,
            borderRadius: '16px',
          },
        })}
        label={
          <Core.Box sx={{ display: 'flex', alignItems: 'center' }}>
            All
            {allCount ? <Chip label={allCount} size="small" variant="filled" sx={{ ml: 1 }} /> : null}
          </Core.Box>
        }
      />
    </Core.Tabs>
  );
};

export default StudyToggle;
