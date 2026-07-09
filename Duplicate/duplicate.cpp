#include <iostream>
using namespace std;

int tar[4] = {1, 2, 3, 2};

int main()
{
    int size = sizeof(tar) / sizeof(tar[0]);

    for (int i = 0; i < size; i++)
    {
        for (int j = i + 1; j < size; j++)
        {
            if (tar[i] == tar[j])
            {
                cout << "Duplicate found: " << tar[i] << endl;
            }
        }
    }

    return 0;
}