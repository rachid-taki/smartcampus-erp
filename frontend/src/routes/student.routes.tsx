import { Route } from "react-router-dom";

import Layout from "../components/student/Layout";

import { Dashboard } from "../pages/StudentPortal/Dashboard";
import {Requests} from "../pages/StudentPortal/Requests";
import {Documents} from "../pages/StudentPortal/Documents";
import {Tracking} from "../pages/StudentPortal/Tracking";
import {History} from "../pages/StudentPortal/History";
import {Profile} from "../pages/StudentPortal/Profile";

export const StudentRoutes = (

    <Route path="/student" element={<Layout />}>

        <Route index element={<Dashboard />} />

        <Route path="requests" element={<Requests />} />

        <Route path="documents" element={<Documents />} />

        <Route path="tracking" element={<Tracking />} />

        <Route path="history" element={<History />} />

        <Route path="profile" element={<Profile />} />

    </Route>

);