import React from 'react';
import TextField from '@mui/material/TextField';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import GitHubIcon from '@mui/icons-material/GitHub';
import { DarkMode } from '@mui/icons-material';
import BiotechIcon from '@mui/icons-material/Biotech';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Box from '@mui/material/Box';

import { HorizontalButtons, TextButton, IconButton } from '../PatchButton';
import usePatchStore from '../../store';
import { usePatchSerialization } from '../../hooks/usePatchSerialization';
import { DropdownMenu } from '../DropdownMenu';
import { auth } from '../../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { SignInButton } from './SignInButton';
import { SignUpButton } from './SignUpButton';
import { SignOutButton } from './SignOutButton';
import { useProjectActions } from '../../hooks/useProjectActions';
import { useLocalStorage } from 'usehooks-ts';
import { ProjectButton } from './ProjectButton';
import { useUser } from '../../hooks/useUser';
import { UserRole } from '../../types/userMeta';
import { Avatar, Button, Tooltip } from '@mui/material';
import { FeatureWrapper } from '../FeatureWrapper';
import { FileDropDown } from './FileDropDown';
import { useSnapbotMode } from '../../contexts/SnapbotModeContext';

type ThemeButtonProps = {
  mode: string,
  setMode: (mode: string) => void,
}

export function ThemeButton({ mode, setMode }: ThemeButtonProps) {

    return (
      <IconButton sx={{ height: "40px", borderStyle: "solid", borderWidth: "1px", borderColor: "primary.light" }} variant="contained" icon={<DarkMode htmlColor={mode === "dark" ? "white" : "black"} />} onClick={() => {
        let newMode = (mode === "dark") ? "light" : "dark";
        setMode(newMode);
        localStorage.setItem("theme", newMode);
          }} />
    );
}

export function FileName() {
  const setProjectName = usePatchStore((state) => state.setProjectName);
  const projectName = usePatchStore((state) => state.projectName);
  if (projectName == "") {
    setProjectName("Untitled");
  }

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(event.target.value);
  };

  return (
    <>
      <TextField
        hiddenLabel
        onChange={handleTextChange}
        id="fileName"
        value= {projectName}
        size="small"
        fullWidth
        sx={{ marginLeft: "-16px" }}
      />
    </>
  );
}

const SaveButton = () => {
  const saveAllThreads = usePatchStore((state) => state.saveAllThreads);
  const projectChanged = usePatchStore((state) => state.projectChanged);
  const setProjectChanged = usePatchStore((state) => state.setProjectChanged);
  const isNewProject = usePatchStore((state) => state.isNewProject);
  const projectName = usePatchStore((state) => state.projectName);

  const [user] = useAuthState(auth);
  const { downloadProject } = usePatchSerialization();
  const { saveProject } = useProjectActions();

  const handleSaveNow = async () => {
    await saveAllThreads();
    if (user) {
      saveProject(projectName);
    } else {
      await downloadProject();
    }
    setProjectChanged(false);
  };

  return (
    <TextButton sx={{ height: "40px", borderStyle: "solid", borderWidth: "1px", borderColor: "primary.light" }} variant="contained" onClick={handleSaveNow} text={projectChanged ? "Save" : "Saved"} disabled={!projectChanged}/>
  );
}

type BetaInfoIconProps = {
  isBetaUser: boolean,
}

function BetaInfoIcon({ isBetaUser }: BetaInfoIconProps) {
  const PATCH_DISCORD_LINK = process.env.REACT_APP_PATCH_DISCORD_LINK || "";
  return (
    <Button sx={{
      backgroundColor: isBetaUser ? "success.main" : "error.main",
      borderRadius: "100px",  
      height: "40px",
      width: "40px",
      ":hover": {
        backgroundColor: isBetaUser ? "success.dark" : "error.dark",
      },
    }}
    onClick={() => {
      if (!isBetaUser) {
        window.open(PATCH_DISCORD_LINK, "_blank");
      }
    }}>
        <BiotechIcon sx={{
            color: "white",
          }}/>
    </Button>
  );
}

type TopBarProps = {
  mode: string,
  setMode: (mode: string) => void,
  appMode: string,
  setAppMode: (mode: string) => void,
}

export function TopBar({ mode, setMode, appMode, setAppMode }: TopBarProps) {
  const {user, userMeta, loading, error} = useUser();
  const { mode: snapbotMode, setMode: setSnapbotMode } = useSnapbotMode();

  const nonBetaTesterTip = "You are not currently a beta tester.";
  const fullBetaExplainer = nonBetaTesterTip + " Click here to join the Patch Discord and become a beta tester."

  const loggedIn = !!user;
  const isBetaUser = loggedIn && (userMeta?.role === UserRole.BETA_TESTER || userMeta?.role === UserRole.ADMIN);

  const handleAppModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: string,
  ) => {
    if (newMode !== null) {
      setAppMode(newMode);
    }
  };

  const handleSnapbotModeChange = (event: SelectChangeEvent) => {
    setSnapbotMode(event.target.value);
  };

  return (
    <Grid container item direction="row" sx={{
      width: "100%",
      padding: "8px",
      maxHeight: "56px",
      backgroundColor: 'primary.dark',
    }}>
      <Grid container item direction="row" xs={3} spacing={2} className="patchTopBar">
        <Grid item>
          <HorizontalButtons>
              {/* <IconButton sx={{ height: "40px", borderStyle: "solid", borderWidth: "1px", borderColor: "primary.light" }} icon={<GitHubIcon />} onClick={() => {window.location.href = 'https://github.com/BX-Coding/patch-ide'}} variant="contained" /> */}
              <FileDropDown cloudEnabled={isBetaUser}/>
              {/* <SaveButton/> */}
          </HorizontalButtons>
        </Grid>
      </Grid>
      <Grid container item direction="row" xs={6} justifyContent="center" alignItems="center">
        <ToggleButtonGroup
          value={appMode}
          exclusive
          onChange={handleAppModeChange}
          aria-label="app mode"
          sx={{ height: "40px" }}
        >
          <ToggleButton value="patch" aria-label="patch mode" sx={{ color: 'text.primary' }}>
            Patch Mode
          </ToggleButton>
          <ToggleButton value="snapbot" aria-label="snapbot mode" sx={{ color: 'text.primary' }}>
            SnapBot Mode
          </ToggleButton>
        </ToggleButtonGroup>
        
        {appMode === "snapbot" && (
          <Box sx={{ ml: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="snapbot-mode-label" sx={{ color: 'text.primary' }}>SnapBot Mode</InputLabel>
              <Select
                labelId="snapbot-mode-label"
                value={snapbotMode}
                label="SnapBot Mode"
                onChange={handleSnapbotModeChange}
                sx={{ height: "40px", color: 'text.primary' }}
              >
                <MenuItem value="simulation">Simulation-Only</MenuItem>
                <MenuItem value="hybrid">Simulation-Physical Hybrid</MenuItem>
                <MenuItem value="soccer">Soccer Game</MenuItem>
              </Select>
            </FormControl>
          </Box>
        )}
      </Grid>
      {/* <Grid container item xs={3} justifyContent="flex-end">
        <Grid item>
          <HorizontalButtons>
            <ThemeButton mode={mode} setMode={setMode} />
            { loggedIn && <FeatureWrapper show={!isBetaUser} message={fullBetaExplainer}>
              <BetaInfoIcon isBetaUser={isBetaUser}/>
            </FeatureWrapper>}
            { loggedIn && <FeatureWrapper show={!isBetaUser} message={nonBetaTesterTip}>
              <ProjectButton disabled={!isBetaUser} />
            </FeatureWrapper>}
            {loggedIn && <SignOutButton />}
            {!loggedIn && <SignInButton />}
            {!loggedIn && <SignUpButton />}
          </HorizontalButtons>
        </Grid>
      </Grid> */}
    </Grid>
  );
}
