import React, { Component } from 'react';
import './App.css';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressBar } from 'primereact/progressbar'
import 'primereact/resources/themes/nova-dark/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Card } from 'primereact/card';
import axios from 'axios'
import { ShowMore } from './showmore'
import { TabView, TabPanel} from 'primereact/tabview'
export default class App extends Component {
  state = {
    getting_contributors: false,
    getting_stats: false,
    contributors: [],
    offset: 0,
    limit: 20,
    row_count: 0,
    search_terms: [],
    stats: {}
  }
  get_contributors = async (offset, limit) => {
    this.setState({ getting_contributors: true, getting_stats: true })
    const responses = await Promise.all([
      axios.get(`http://localhost:4500/shortlist?offset=${offset}&limit=${limit}`),
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

    this.get_contributors(this.state.offset, this.state.limit)

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
        <Card title="Candidates">
          <TabView>
            <TabPanel header="New Candidates">
            <DataTable
            // header={this.render_header()}
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
              const offset = e.first
              const limit = e.rows || 10
              await this.setState({ offset, limit })
              await this.get_contributors(offset, limit)
            }}
            paginator={true}
            stateStorage={`shortlist-table-settings`}
            rowsPerPageOptions={[10, 30, 1000]}
            currentPageReportTemplate="Showing {first}-{last} of {totalRecords} entries"
            paginatorTemplate='CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown'
          >
            <Column field="Image" header="Image"
              body={(row, column) => <div>
                <img alt="avatar" height="100" src={row.avatar_url} />
                <br />
                <span>{row.login}</span>
              </div>}
              // style={{ textAlign: 'center' }}
              sortable={false}
            />

            <Column field="packages" header="Packages" body={(row, column) => {
              return (
                <ul>
                  <ShowMore>
                    {row.packages.split(', ').map((el, i) => {
                      return (
                        <li key={i}>{el}</li>
                      )
                    })}
                  </ShowMore>
                </ul>
              )

            }} />
            <Column field="name" header="name" />
            <Column field="location" header="Location" />
            <Column field="blog" header="website" body={
              (row, column) => <a href={row.blog} target="_blank">{row.blog}</a>
            } />
            <Column field="email" header="email" />
            <Column field="bio" header="bio" />
          </DataTable>
            </TabPanel>
            <TabPanel header="Approved">
            </TabPanel>
            <TabPanel header="Rejected">
            </TabPanel>
          </TabView>

        </Card>
      </center>
    );
  }
}
