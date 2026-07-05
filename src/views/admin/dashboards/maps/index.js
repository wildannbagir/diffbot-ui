import React from "react";
import { useLocation } from "react-router-dom";
import CreateMap from "./components/CreateMap";
import ViewMaps from "./components/ViewMaps";

const Maps = () => {
  const location = useLocation();
  const isViewPath = location.pathname.endsWith('/view');
  
  return isViewPath ? <ViewMaps /> : <CreateMap />;
};

export default Maps; 