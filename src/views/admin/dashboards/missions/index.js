import React from "react";
import { useLocation } from "react-router-dom";
import CreateMission from "./components/CreateMission";
import ViewMissions from "./components/ViewMissions";

const Missions = () => {
  const location = useLocation();
  const isViewPath = location.pathname.endsWith('/view');
  
  return isViewPath ? <ViewMissions /> : <CreateMission />;
};

export default Missions; 