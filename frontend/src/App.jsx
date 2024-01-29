
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Success from './components/Success';
import Cancel from './components/Cancel';
import Price from './components/Price/Price'

function App() {

  return (
    <BrowserRouter>
      <Routes>
          <Route path="/" element={<Price/>}/>
          <Route path="/success" element={<Success/>}/>
          <Route path="/cancel" element={<Cancel/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
