import React from "react";
import { useLocation } from "react-router-dom";
import CreatePath from "./components/CreatePath";
import ViewPaths from "./components/ViewPaths";

const Paths = () => {
  const location = useLocation();
  const isViewPath = location.pathname.endsWith('/view');
  
  return isViewPath ? <ViewPaths /> : <CreatePath />;
};

export default Paths; 