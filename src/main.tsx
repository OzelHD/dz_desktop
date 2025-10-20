import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import '@mantine/core/styles.css';
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import theme from './dz_desktop_theme';


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
     <ColorSchemeScript defaultColorScheme="dark" />
     
     <MantineProvider defaultColorScheme="dark" theme={theme}><App /></MantineProvider>
    
  </React.StrictMode>,
);
