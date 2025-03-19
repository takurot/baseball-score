import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Tabs,
  Tab,
  Box,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SportsBaseballIcon from '@mui/icons-material/SportsBaseball';
import MenuIcon from '@mui/icons-material/Menu';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`help-tabpanel-${index}`}
      aria-labelledby={`help-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="help-dialog-title"
    >
      <DialogTitle id="help-dialog-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          <SportsBaseballIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          野球スコア アプリの使い方
        </Typography>
        <IconButton aria-label="close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="help topics tabs">
            <Tab label="はじめに" />
            <Tab label="チーム・選手管理" />
            <Tab label="試合スコア入力" />
            <Tab label="保存と共有" />
            <Tab label="よくある質問" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            野球スコアアプリへようこそ！
          </Typography>
          <Typography paragraph>
            このアプリでは、野球の試合スコアを簡単に記録・管理・共有することができます。使い方は簡単です：
          </Typography>
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <List>
              <ListItem>
                <ListItemIcon><GroupsIcon /></ListItemIcon>
                <ListItemText primary="1. チームと選手を登録する" secondary="メニューから「チーム・選手管理」を選択し、チームと選手を登録します" />
              </ListItem>
              <ListItem>
                <ListItemIcon><EditIcon /></ListItemIcon>
                <ListItemText primary="2. 試合データを入力する" secondary="各イニングの打席結果を記録します" />
              </ListItem>
              <ListItem>
                <ListItemIcon><SaveIcon /></ListItemIcon>
                <ListItemText primary="3. 試合データを保存する" secondary="入力したデータはクラウドに保存され、後で編集できます" />
              </ListItem>
              <ListItem>
                <ListItemIcon><ShareIcon /></ListItemIcon>
                <ListItemText primary="4. 試合結果を共有する" secondary="公開設定を有効にして、URLで試合結果を共有できます" />
              </ListItem>
            </List>
          </Paper>
          <Typography>
            各機能の詳細については、上のタブを選択して確認してください。
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            チームと選手の管理
          </Typography>
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              チームの登録方法
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><MenuIcon sx={{ fontSize: '1.25rem' }} /></ListItemIcon>
                <ListItemText primary="1. メニューアイコンをクリック" secondary="画面左上のメニューアイコンをクリックします" />
              </ListItem>
              <ListItem>
                <ListItemIcon><GroupsIcon sx={{ fontSize: '1.25rem' }} /></ListItemIcon>
                <ListItemText primary="2. 「チーム・選手管理」を選択" secondary="メニューから「チーム・選手管理」を選択します" />
              </ListItem>
              <ListItem>
                <ListItemIcon><AddIcon sx={{ fontSize: '1.25rem' }} /></ListItemIcon>
                <ListItemText primary="3. 「新規チーム作成」ボタンをクリック" secondary="チーム名を入力して新しいチームを作成します" />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              選手の登録方法
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="1. チームを選択" secondary="編集したいチームの「編集」ボタンをクリックします" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. 「選手を追加」ボタンをクリック" secondary="名前、背番号、ポジションを入力します" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. 登録完了" secondary="「追加」ボタンをクリックして選手を登録します" />
              </ListItem>
            </List>
          </Paper>

          <Typography paragraph>
            登録したチームと選手は、試合データ入力時に選択できるようになります。
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            試合スコアの入力方法
          </Typography>
          
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              基本的な試合データの設定
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="1. トップページで日付をクリック" secondary="試合日を設定できます" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. 「大会名をクリックして設定」をクリック" secondary="大会名と球場・場所を入力できます" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. 「前の回」「次の回」ボタンでイニングを変更" secondary="現在入力中のイニングを変更できます" />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              打席結果の記録方法
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="1. チームタブを選択" secondary="先攻/後攻のどちらのチームかタブで選択します" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. 選手名の横の「打席登録」ボタンをクリック" secondary="打席に入る選手を選びます" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. 打席結果を入力" secondary="結果の種類、詳細、打点などを入力し「登録」ボタンをクリックします" />
              </ListItem>
              <ListItem>
                <ListItemText primary="4. 打席履歴の確認" secondary="入力した打席結果は下部の履歴に表示され、編集や削除が可能です" />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              打席結果の表示モード切替
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="「一覧表示」ボタンをクリック" secondary="選手ごとの打席結果一覧を表示します。再度クリックすると編集モードに戻ります" />
              </ListItem>
            </List>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            試合データの保存と共有
          </Typography>
          
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              試合データの保存方法
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><SaveIcon sx={{ fontSize: '1.25rem' }} /></ListItemIcon>
                <ListItemText primary="1. 「保存」ボタンをクリック" secondary="画面上部の保存ボタンをクリックします" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. 保存確認ダイアログで「保存」をクリック" secondary="初回は「保存」、2回目以降は「上書き保存」または「新規保存」を選択できます" />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              保存した試合データの読み込み方法
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon><MenuIcon sx={{ fontSize: '1.25rem' }} /></ListItemIcon>
                <ListItemText primary="1. メニューアイコンをクリック" secondary="画面左上のメニューアイコンをクリックします" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. 「試合一覧を表示」を選択" secondary="保存済みの試合一覧が表示されます" />
              </ListItem>
              <ListItem>
                <ListItemText primary="3. 読み込みたい試合をクリック" secondary="選択した試合データが読み込まれます" />
              </ListItem>
            </List>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              試合結果の共有方法
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="1. 試合一覧から共有したい試合を見つける" secondary="「試合一覧を表示」から対象の試合を探します" />
              </ListItem>
              <ListItem>
                <ListItemText primary="2. 公開設定をオンにする" secondary="「公開」スイッチをオンにします" />
              </ListItem>
              <ListItem>
                <ListItemIcon><ShareIcon sx={{ fontSize: '1.25rem' }} /></ListItemIcon>
                <ListItemText primary="3. 「共有URL」ボタンをクリック" secondary="URLがコピーされます" />
              </ListItem>
              <ListItem>
                <ListItemText primary="4. URLを共有" secondary="コピーしたURLをメッセージやSNSで共有します" />
              </ListItem>
            </List>
          </Paper>
          
          <Typography paragraph>
            共有された試合データは、閲覧者がアプリにログインしていなくても表示できます。
          </Typography>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            よくある質問
          </Typography>
          
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Q: 試合データは誰でも見られますか？
            </Typography>
            <Typography paragraph>
              A: いいえ、試合データは初期設定では非公開です。「試合一覧」画面で明示的に公開設定をオンにした試合のみが共有URLで閲覧可能になります。
            </Typography>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Q: 一度共有した試合データを非公開に戻せますか？
            </Typography>
            <Typography paragraph>
              A: はい、いつでも「試合一覧」画面から公開設定をオフにすることで非公開に戻せます。既に共有したURLは無効になります。
            </Typography>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Q: 編集中のデータは自動保存されますか？
            </Typography>
            <Typography paragraph>
              A: いいえ、データは「保存」ボタンを押した時のみ保存されます。アプリを閉じる前に必ず保存してください。
            </Typography>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Q: 試合データを削除するにはどうすればいいですか？
            </Typography>
            <Typography paragraph>
              A: 「試合一覧」画面で削除したい試合の「削除」ボタンをクリックすることで削除できます。削除したデータは元に戻せませんのでご注意ください。
            </Typography>
          </Paper>

          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Q: オフラインでも使用できますか？
            </Typography>
            <Typography paragraph>
              A: 基本的な機能はオフラインでも使用できますが、データの保存と読み込みにはインターネット接続が必要です。オフライン時に入力したデータは、接続復旧後に保存してください。
            </Typography>
          </Paper>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog; 