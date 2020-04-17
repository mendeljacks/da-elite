import React, { Component } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ShowMore } from './showmore'
import { Button } from 'primereact/button';
import axios from 'axios'
import { InputTextarea } from 'primereact/inputtextarea';

class ShortListTable extends Component {
    state = {
        getting_contributors: false,
        contributors: {},
        offset: 0,
        limit: 20,
        row_count: 0,
        search_terms: [],
    }
    edit_note = async (id, note) => {
        await this.setState(state => {
            ((state.contributors || {})[id] || {})['human_contact_notes'] = note
            return state
        })
    }
    save_note = async (id, note) => {
        this.setState(state => {
            ((state.contributors || {})[id] || {})['saving_note'] = true
            return state
        })
        await axios.patch('http://localhost:4500/notes', { id, note })
        this.setState(state => {
            ((state.contributors || {})[id] || {})['saving_note'] = false
            return state
        })
    }
    human_approved = async (id, human_approved) => {
        await axios.patch('http://localhost:4500/approve', { id, human_approved })
        await this.setState(state => {
            delete state.contributors[id]
            return state
        })
        // this.setState(state => {
        //     ((state.contributors||{})[id]||{})['saving_note'] = false
        //     return state
        // })
    }
    get_contributors = async (offset, limit) => {
        this.setState({ getting_contributors: true })
        const responses = await Promise.all([
            axios.get(`http://localhost:4500/shortlist?offset=${offset}&limit=${limit}&human_approved=${this.props.human_approved}`),
        ])
        const row_count = responses[0].data.row_count
        this.setState({
            getting_contributors: false,
            row_count: row_count,
            contributors: responses[0].data.contributors.reduce((acc, val) => { acc[val.id] = val; return acc }, {}),
        })
        this.props.on_count(row_count)

    }
    componentDidMount = async () => {
        this.get_contributors(this.state.offset, this.state.limit)
    }
    render() {
        return (
            <DataTable
                // header={this.render_header()}
                value={Object.values(this.state.contributors)}
                // loading={this.state.getting_contributors}
                sortOrder={-1}
                sortMode='multiple'
                // multiSortMeta={[{ field: 'github', order: -1 }]}
                // metaKeySelection={false}
                autoLayout={true}
                responsive={true}
                // lazy={true}
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
                        <span>{row.name}</span>
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
                <Column field="location" header="Location" />
                <Column field="blog" header="website" body={
                    (row, column) => <a href={row.blog} target="_blank">{row.blog}</a>
                } />
                <Column field="email" header="email" />
                {/* <Column field="bio" header="bio" /> */}
                <Column field="action" header="Action" body={(row, column) => {
                    return (<div>
                        {this.props.human_approved !== 1 && <Button
                            style={{ margin: '2px' }}
                            onClick={() => { this.human_approved(row.id, 1) }}
                            label={`Accept`}
                            className="p-button-success p-button-rounded"
                        />}
                        {this.props.human_approved !== 0 && <Button
                            style={{ margin: '2px' }}
                            onClick={() => { this.human_approved(row.id, 0) }}
                            label={'Reject'}
                            className="p-button-danger p-button-rounded"
                        />}
                        {this.props.human_approved !== null && <Button
                            style={{ margin: '2px' }}
                            onClick={() => { this.human_approved(row.id, null) }}
                            label={'Reconsider'}
                            className="p-button-secondary p-button-rounded"
                        />}
                    </div>)
                }} />
                <Column field="human_contact_notes" header="Notes" body={(r, c) => {
                    return (<div key={r.id}>
                        <InputTextarea rows={5} cols={30}
                            value={r.human_contact_notes}
                            onChange={(e) => this.edit_note(r.id, e.target.value)} />
                        <br />
                        <Button
                            style={{ margin: '2px' }}
                            onClick={() => { this.save_note(r.id, r.human_contact_notes) }}
                            label={r.saving_note ? 'Saving...' : 'Save note'}
                            disabled={r.saving_note ? true : false}
                            className="p-button-secondary p-button-rounded"
                        />
                    </div>)

                }} />

            </DataTable>
        );
    }
}

export default ShortListTable;