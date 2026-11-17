import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import {
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_UPDATED,
} from '../content/privacyPolicy';

interface PrivacyPolicyDialogProps {
  open: boolean;
  onClose: () => void;
}

const TITLE_ID = 'privacy-policy-title';

const PrivacyPolicyDialog: React.FC<PrivacyPolicyDialogProps> = ({
  open,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="sm"
    fullWidth
    aria-labelledby={TITLE_ID}
  >
    <DialogTitle id={TITLE_ID}>プライバシーポリシー</DialogTitle>
    <DialogContent dividers>
      <Typography variant="caption" color="text.secondary" component="p">
        最終更新日: {PRIVACY_POLICY_UPDATED}
      </Typography>
      {PRIVACY_POLICY_SECTIONS.map((section) => (
        <section key={section.title}>
          <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1 }}>
            {section.title}
          </Typography>
          {section.paragraphs.map((paragraph) => (
            <Typography key={paragraph} variant="body2" paragraph>
              {paragraph}
            </Typography>
          ))}
        </section>
      ))}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>閉じる</Button>
    </DialogActions>
  </Dialog>
);

export default PrivacyPolicyDialog;
