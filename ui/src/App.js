import React, { Component } from 'react';
import './App.css';

import { ProgressBar } from 'primereact/progressbar'
import 'primereact/resources/themes/nova-dark/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Card } from 'primereact/card';
import axios from 'axios'
import { TabView, TabPanel } from 'primereact/tabview'
import ShortListTable from './components/short_list_table';

export default class App extends Component {
  state = {
    getting_stats: false,
    stats: {}
  }
  get_stats = async (offset, limit) => {
    this.setState({ getting_stats: true })
    const responses = await Promise.all([
      axios.get('http://localhost:4500/stats')
    ])
    this.setState({
      getting_stats: false,
      stats: responses[0].data
    })

  }
  componentDidMount() {
    this.get_stats()
  }



  render = () => {
    return (
      <center>
        {this.state.getting_stats && <ProgressBar mode="indeterminate" />}

        <Card title="Stats">
          <table>
            <thead>
              <tr>
                <th>Scrape NPMs</th>
                <th>Scrape Github packages</th>
                <th>Scrape Github people</th>
                <th>Detected faces</th>
                <th>Shortlisted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{Number(this.state.stats['found_packages']).toLocaleString()} / {Number(this.state.stats['total_packages']).toLocaleString()}</td>
                <td>{Number(this.state.stats['found_pop']).toLocaleString()} / {Number(this.state.stats['total_packages']).toLocaleString()}</td>
                <td>{Number(this.state.stats['checked_people']).toLocaleString()} / {Number(this.state.stats['total_people']).toLocaleString()}</td>
                <td>{Number(this.state.stats['checked_faces']).toLocaleString()} / {Number(this.state.stats['total_people']).toLocaleString()}</td>
                <td>{Number(this.state.stats['shortlisted_people']).toLocaleString()} / {Number(this.state.stats['short_list_ready']).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <br />
        {this.state.getting_contributors && <ProgressBar mode="indeterminate" />}
        <Card title="Shortlist">
          <TabView>
            <TabPanel header={`Waiting ${this.state.waiting ? `(${this.state.waiting})` : ``}`}>
              <ShortListTable on_count={num=>this.setState({waiting:num})} human_approved={null}></ShortListTable>
            </TabPanel>
            <TabPanel header={`Approved ${this.state.approved ? `(${this.state.approved})` : ``}`}>
              <ShortListTable on_count={num=>this.setState({approved:num})} human_approved={1}></ShortListTable>
            </TabPanel>
            <TabPanel header={`Rejected ${this.state.rejected ? `(${this.state.rejected})` : ``}`}>
              <ShortListTable on_count={num=>this.setState({rejected:num})} human_approved={0}></ShortListTable>
            </TabPanel>
          </TabView>

        </Card>
      </center>
    );
  }
}
