class SomeComponent extends React.Component<{
        foo: number;
    }, {
        bar: string;
    }> {
    static propTypes = { foo: React.PropTypes.string };
}