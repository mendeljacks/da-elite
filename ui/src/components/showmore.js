import React from 'react'
import { Button } from 'primereact/button';
export class ShowMore extends React.Component {
    state = {
        expanded: false,
        show_only: 3
    }
    render() {
        const truncated_count = this.props.children.length - this.state.show_only
        return (
            <div>
                {this.state.expanded ? this.props.children : this.props.children.slice(0, this.state.show_only)}
                {truncated_count > 0 && !this.state.expanded &&
                    <Button
                        onClick={() => { this.setState({ expanded: true }) }}
                        label={`+ ${truncated_count} more`}
                        className="p-button-secondary p-button-rounded"
                    />

                }
                {this.state.expanded &&
                    <Button
                        onClick={() => { this.setState({ expanded: false }) }}
                        label={'show less'}
                        className="p-button-secondary p-button-rounded"
                    />

                }
            </div>
        )
    }
}