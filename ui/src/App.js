import React, { Component } from 'react';
import './App.css';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressBar } from 'primereact/progressbar'
import 'primereact/resources/themes/nova-dark/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import {Card} from 'primereact/card';
import axios from 'axios'

export default class App extends Component {
  state = {
    getting_contributors: false,
    getting_stats: false,
    contributors: [],
    offset: 0,
    limit: 10,
    row_count: 0,
    search_terms: []
  }
  get_contributors = async () => {
    this.setState({ getting_contributors: true, getting_stats:true })
    const responses = await Promise.all([
      axios.get('http://localhost:4500/contributors'),
      axios.get('http://localhost:4500/stats')
    ])
    this.setState({ 
      getting_contributors: false, 
      getting_stats: false,
      row_count: responses[0].data.row_count,
      contributors: responses[0].data.contributors,
      stats: responses[1].data
    })

  }

  componentDidMount = async () => {

    this.get_contributors()

  }
  render_header = () => <div className='p-grid p-align-center'>
    <div className='p-col-6' style={{ textAlign: 'left' }}>
      <div style={{ fontSize: '2em', margin: '0px', padding: '10px', fontFamily: 'Lato', color: '#d3d3d3' }} >
        {'Shortlist'}
      </div>
    </div>

  </div>

  render = () => {
    return (
      <center>
        {this.state.getting_stats && <ProgressBar mode="indeterminate" />}

        <Card title="Stats">
          
        </Card>
        <br />
        {this.state.getting_contributors && <ProgressBar mode="indeterminate" />}
        <DataTable
          header={this.render_header()}
          value={this.state.contributors}
          // loading={this.state.getting_contributors}
          sortOrder={-1}
          sortMode='multiple'
          multiSortMeta={[{ field: 'github', order: -1 }]}
          metaKeySelection={false}
          autoLayout={true}
          responsive={true}
          lazy={true}
          first={this.state.offset}
          rows={this.state.limit}
          totalRecords={this.state.row_count}
          onPage={async e => {
            await this.setState({ offset: e.first, limit: e.rows || 10 })
            await this.get_contributors()
          }}
          paginator={true}
          stateStorage={`shortlist-table-settings`}
          rowsPerPageOptions={[10, 30, 1000]}
          currentPageReportTemplate="Showing {first}-{last} of {totalRecords} entries"
          paginatorTemplate='CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown'
        >
          <Column field="Picture" header="Picture"
            body={(row, column) => JSON.stringify(row, column)}
            // style={{ textAlign: 'center' }}
            sortable={false}
          />
          <Column field="login" header="Github" />
          <Column field="Gender" header="Gender" />
          <Column field="Age" header="Age" />
          <Column field="Emotion" header="Emotion" />
        </DataTable>
      </center>
    );
  }
}
