type HelloProps = {
    message?: string;
};
export const Hello: React.SFC<HelloProps> = ({ message }) => {
    return <div>hello {message}</div>;
};
