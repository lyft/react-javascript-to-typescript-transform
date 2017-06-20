import * as React from 'react';

type IMyComponentProps = {

};
type IMyComponentState = void;

export default class MyComponent extends React.Component<IMyComponentProps, IMyComponentState> {
    render() {
        return <div />;
    }
}