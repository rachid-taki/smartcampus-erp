// import { Routes } from "react-router-dom";
// import { StudentRoutes } from "./routes/student.routes";

// function App() {
//   // return <Routes>{StudentRoutes}</Routes>;

// }

// export default App;

import { Routes, Route } from "react-router-dom";
import {Dashboard} from "./pages/StudentPortal/Dashboard";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
