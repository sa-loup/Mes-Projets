// src/pages/Home.js
import React from 'react';
import Navbar from '../components/Navbar';
import Banner from '../components/Banner';
import Row from '../components/Row';
import requests from '../requests';

const Home = () => {
  return (
    <div className="home">
      <Navbar />
      <Banner />
      <Row title="Originaux Netflix" fetchUrl={requests.fetchNetflixOriginals} />
      <Row title="Tendances" fetchUrl={requests.fetchTrending} />
      <Row title="Les mieux notés" fetchUrl={requests.fetchTopRated} />
      <Row title="Films d'action" fetchUrl={requests.fetchActionMovies} />
      <Row title="Comédies" fetchUrl={requests.fetchComedyMovies} />
      <Row title="Films d'horreur" fetchUrl={requests.fetchHorrorMovies} />
      <Row title="Romance" fetchUrl={requests.fetchRomanceMovies} />
      <Row title="Documentaires" fetchUrl={requests.fetchDocumentaries} />
    </div>
  );
};

export default Home;