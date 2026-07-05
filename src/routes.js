import React from 'react';
import {
  MdHome,
  MdMap,
  MdAddLocation,
  MdLocationOn,
  MdList,
  MdTimeline,
  MdAdd,
  MdAssignment,
  MdAssessment,
  MdCamera,
  MdSettings,
} from 'react-icons/md';

// Admin Imports
import DashboardsHome from 'views/admin/dashboards/home';
import Paths from 'views/admin/dashboards/paths';
import Maps from 'views/admin/dashboards/maps';
import Missions from 'views/admin/dashboards/missions';

const routes = [
      {
        name: 'Home',
        layout: '/admin',
    path: '/home',
    icon: MdHome,
    component: DashboardsHome
      },
      {
    name: 'Camera',
        layout: '/admin',
    path: '/camera',
    icon: MdCamera,
    component: DashboardsHome
  },
  {
    name: 'Maps',
    layout: '/admin',
    path: '/maps',
    icon: MdMap,
    items: [
      {
        name: 'Create Map',
        layout: '/admin',
        path: '/maps/create',
        icon: MdAddLocation,
        component: Maps
      },
      {
        name: 'View Maps',
        layout: '/admin',
        path: '/maps/view',
        icon: MdLocationOn,
        component: Maps
      }
    ]
  },
  {
    name: 'Paths',
    layout: '/admin',
    path: '/paths',
    icon: MdTimeline,
    items: [
      {
        name: 'Create Path',
        layout: '/admin',
        path: '/paths/create',
        icon: MdAdd,
        component: Paths
      },
      {
        name: 'View Paths',
        layout: '/admin',
        path: '/paths/view',
        icon: MdList,
        component: Paths
      }
    ]
  },
  {
    name: 'Missions',
    layout: '/admin',
    path: '/missions',
    icon: MdAssignment,
    items: [
      {
        name: 'Create Mission',
        layout: '/admin',
        path: '/missions/create',
        icon: MdAdd,
        component: Missions
      },
      {
        name: 'View Missions',
        layout: '/admin',
        path: '/missions/view',
        icon: MdList,
        component: Missions
      }
    ]
  },
  {
    name: 'Reports & Logging',
            layout: '/admin',
    path: '/reports',
    icon: MdAssessment,
    component: DashboardsHome
          },
          {
            name: 'Settings',
            layout: '/admin',
    path: '/settings',
    icon: MdSettings,
    component: DashboardsHome
  }
];

export default routes;
